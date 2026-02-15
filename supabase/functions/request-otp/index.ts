import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

declare const Deno: any;

export const config = { auth: false };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const SMSC_LOGIN = Deno.env.get('SMSC_LOGIN');
const SMSC_PASSWORD = Deno.env.get('SMSC_PASSWORD');
const SMSC_SENDER = Deno.env.get('SMSC_SENDER');
const SMSC_TEST = Deno.env.get('SMSC_TEST') === 'true';
const SMSC_DEBUG = Deno.env.get('SMSC_DEBUG') === 'true';

const OTP_SECRET = Deno.env.get('OTP_SECRET') || 'local-otp-secret';
const OTP_TTL_MINUTES = Number(Deno.env.get('OTP_TTL_MINUTES') || '5');
const OTP_LENGTH = Number(Deno.env.get('OTP_LENGTH') || '6');

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const normalizePhone = (value: string) => value.trim();

const generateCode = (length: number) => {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
};

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

    const code = generateCode(OTP_LENGTH);
    const codeHash = await hashOtp(normalizedPhone, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('phone', normalizedPhone)
      .eq('used', false);

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

    if (SMSC_TEST) {
      console.log('SMSC_TEST enabled. OTP generated:', { phone: normalizedPhone, code });
      return new Response(JSON.stringify({ success: true, test: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const message = `Код подтверждения: ${code}`;
    const senderParam = SMSC_SENDER ? `&sender=${encodeURIComponent(SMSC_SENDER)}` : '';
    const smsUrl = `https://smsc.ru/sys/send.php?login=${encodeURIComponent(
      SMSC_LOGIN
    )}&psw=${encodeURIComponent(
      SMSC_PASSWORD
    )}&phones=${encodeURIComponent(normalizedPhone)}&mes=${encodeURIComponent(
      message
    )}${senderParam}&fmt=3&charset=utf-8`;

    const smsResponse = await fetch(smsUrl);
    const smsResult = await smsResponse.json();

    if (!smsResponse.ok || smsResult?.error) {
      console.error('SMSC error:', smsResult);
      const payload: Record<string, unknown> = { error: 'Failed to send SMS' };
      if (SMSC_DEBUG) {
        payload.details = smsResult ?? null;
      }
      return new Response(JSON.stringify(payload), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
