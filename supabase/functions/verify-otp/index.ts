import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SignJWT } from 'https://esm.sh/jose@5.2.4';

declare const Deno: any;

export const config = { auth: false };

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_JWT_SECRET =
  Deno.env.get('SUPABASE_JWT_SECRET') || Deno.env.get('JWT_SECRET');

const OTP_SECRET = Deno.env.get('OTP_SECRET') || 'local-otp-secret';
const OTP_MAX_ATTEMPTS = Number(Deno.env.get('OTP_MAX_ATTEMPTS') || '5');
const JWT_EXPIRES_IN = Deno.env.get('JWT_EXPIRES_IN') || '30d';

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

    if (!SUPABASE_JWT_SECRET) {
      return new Response(JSON.stringify({ error: 'Missing JWT secret' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { phone, code, name } = await req.json();
    const normalizedPhone = phone ? normalizePhone(phone) : '';
    const otp = code ? String(code).trim() : '';

    if (!normalizedPhone || !otp) {
      return new Response(JSON.stringify({ error: 'Missing phone or code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: otpRows, error: fetchError } = await supabase
      .from('otp_codes')
      .select('id, code_hash, attempts, expires_at')
      .eq('phone', normalizedPhone)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const record = otpRows?.[0];
    if (!record) {
      return new Response(JSON.stringify({ error: 'OTP not found or expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const expectedHash = await hashOtp(normalizedPhone, otp);
    if (expectedHash !== record.code_hash) {
      const nextAttempts = (record.attempts || 0) + 1;
      await supabase
        .from('otp_codes')
        .update({ attempts: nextAttempts, used: nextAttempts >= OTP_MAX_ATTEMPTS })
        .eq('id', record.id);

      return new Response(JSON.stringify({ error: 'Invalid code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await supabase.from('otp_codes').update({ used: true }).eq('id', record.id);

    const userId = normalizedPhone;
    const displayName = name?.trim() || normalizedPhone;

    await supabase.from('profiles').upsert(
      {
        id: userId,
        name: displayName,
        phone_number: normalizedPhone,
        is_public: true
      },
      { onConflict: 'id' }
    );

    const secret = encoder.encode(SUPABASE_JWT_SECRET);
    const accessToken = await new SignJWT({
      role: 'authenticated',
      aud: 'authenticated',
      phone: normalizedPhone,
      app_metadata: { provider: 'smsc' },
      user_metadata: { name: displayName }
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer('supabase')
      .setSubject(userId)
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(secret);

    return new Response(
      JSON.stringify({
        access_token: accessToken,
        user_id: userId,
        phone: normalizedPhone,
        name: displayName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
