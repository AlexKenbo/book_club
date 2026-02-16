import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

declare const Deno: any;

export const config = { auth: false };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const SMSC_LOGIN = Deno.env.get('SMSC_LOGIN');
const SMSC_PASSWORD = Deno.env.get('SMSC_PASSWORD');
const SMSC_TEST = Deno.env.get('SMSC_TEST') === 'true';
const SMSC_DEBUG = Deno.env.get('SMSC_DEBUG') === 'true';

const OTP_SECRET = Deno.env.get('OTP_SECRET') || 'local-otp-secret';
const OTP_TTL_MINUTES = Number(Deno.env.get('OTP_TTL_MINUTES') || '5');

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const normalizePhone = (value: string) => value.trim();

const hashOtp = async (phone: string, code: string) => {
  const data = encoder.encode(`${phone}:${code}:${OTP_SECRET}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toHex(hash);
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!SMSC_LOGIN || !SMSC_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Missing SMSC credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { phone } = await req.json();
    const normalizedPhone = phone ? normalizePhone(phone) : '';

    if (!normalizedPhone) {
      return new Response(JSON.stringify({ error: 'Missing phone' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('phone', normalizedPhone)
      .eq('used', false);

    let code: string;

    if (SMSC_TEST) {
      code = '1234';
      console.log('SMSC_TEST enabled. OTP code:', { phone: normalizedPhone, code });
    } else {
      const callUrl = `https://smsc.ru/sys/wait_call.php?login=${encodeURIComponent(
        SMSC_LOGIN
      )}&psw=${encodeURIComponent(
        SMSC_PASSWORD
      )}&phone=${encodeURIComponent(normalizedPhone)}&fmt=3`;

      const callResponse = await fetch(callUrl);
      const callResult = await callResponse.json();

      if (!callResponse.ok || callResult?.error) {
        console.error('SMSC wait_call error:', callResult);
        const payload: Record<string, unknown> = { error: 'Failed to initiate call' };
        if (SMSC_DEBUG) {
          payload.details = callResult ?? null;
        }
        return new Response(JSON.stringify(payload), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // wait_call returns: array of phone numbers, or object with "phones" key
      let phones: string[];
      if (Array.isArray(callResult)) {
        phones = callResult;
      } else if (Array.isArray(callResult?.phones)) {
        phones = callResult.phones;
      } else {
        console.error('SMSC wait_call: unexpected response format', callResult);
        const payload: Record<string, unknown> = { error: 'Unexpected call response' };
        if (SMSC_DEBUG) {
          payload.details = callResult ?? null;
        }
        return new Response(JSON.stringify(payload), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!phones[0]) {
        console.error('SMSC wait_call: empty phones array', callResult);
        return new Response(JSON.stringify({ error: 'No caller number received' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      code = phones[0].slice(-4);
    }

    const codeHash = await hashOtp(normalizedPhone, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('otp_codes').insert({
      phone: normalizedPhone,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      used: false
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, test: SMSC_TEST || undefined }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
