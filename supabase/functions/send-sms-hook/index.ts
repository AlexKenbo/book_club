import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

// Получаем секреты из настроек Supabase (supabase secrets set ...)
const SMSC_LOGIN = Deno.env.get('SMSC_LOGIN');
const SMSC_PASSWORD = Deno.env.get('SMSC_PASSWORD');
const SMSC_SENDER = Deno.env.get('SMSC_SENDER') || 'BookClub';
const SMSC_TEST = Deno.env.get('SMSC_TEST') === 'true';

const pickFirst = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (value) return value;
  }
  return undefined;
};

serve(async (req: any) => {
  try {
    const payload = await req.json();

    // Этот хук вызывается, когда Supabase Auth создает запись в таблице auth.users (или своей внутренней для OTP)
    // В реальном сценарии мы используем Supabase Auth Hooks (Custom SMS provider)
    // Это пример реализации логики отправки

    const record = payload?.record ?? {};
    const phone = pickFirst(
      payload?.phone,
      payload?.user?.phone,
      payload?.data?.phone,
      payload?.sms?.phone,
      record?.phone
    );
    const otpCode = pickFirst(
      payload?.otp,
      payload?.otp_code,
      payload?.token,
      payload?.code,
      payload?.sms?.otp,
      payload?.sms?.token,
      payload?.data?.otp,
      record?.otp_code,
      record?.token
    );

    if (!phone || !otpCode) {
      return new Response(JSON.stringify({ error: 'Missing phone or code' }), { status: 400 });
    }

    if (!SMSC_LOGIN || !SMSC_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Missing SMSC credentials' }), { status: 500 });
    }

    if (SMSC_TEST) {
      console.log('SMSC_TEST enabled. Skipping SMS send.', { phone, otpCode });
      return new Response(JSON.stringify({ success: true, test: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Отправка через API SMS-провайдера (например, smsc.ru)
    const message = `Код подтверждения: ${otpCode}`;
    const smsUrl = `https://smsc.ru/sys/send.php?login=${encodeURIComponent(
      SMSC_LOGIN
    )}&psw=${encodeURIComponent(
      SMSC_PASSWORD
    )}&phones=${encodeURIComponent(phone)}&mes=${encodeURIComponent(
      message
    )}&sender=${encodeURIComponent(SMSC_SENDER)}&fmt=3&charset=utf-8`;
    
    const smsResponse = await fetch(smsUrl);
    const smsResult = await smsResponse.json();

    console.log(`SMS sent to ${phone}:`, smsResult);

    return new Response(
      JSON.stringify({ success: true, provider_response: smsResult }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
