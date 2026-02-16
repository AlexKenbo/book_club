import React, { useState } from 'react';
import { useNavigate } from '../components/Layout';
import { getSupabase, setSessionToken } from '../lib/supabaseClient';
import { PhoneIcon, KeyIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface AuthProps {
  onSignedIn?: () => void;
}

type Step = 'phone' | 'code';

const Auth: React.FC<AuthProps> = ({ onSignedIn }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [channel, setChannel] = useState<'telegram' | 'call'>('telegram');

  const requestOtp = async (via: 'telegram' | 'call' = channel) => {
    const supabase = getSupabase();
    if (!supabase) {
      setStatus('Supabase не настроен. Проверьте ключи.');
      return;
    }

    if (!phone.trim()) {
      setStatus('Введите номер телефона.');
      return;
    }

    setIsLoading(true);
    setStatus(null);
    setChannel(via);

    const { data, error } = await supabase.functions.invoke('request-otp', {
      body: { phone, channel: via }
    });

    if (error || data?.error) {
      let msg = data?.error || 'Ошибка отправки кода.';
      try {
        const body = await (error as any)?.context?.json?.();
        if (body?.error) msg = body.error;
        if (body?.details) msg += ` (${JSON.stringify(body.details)})`;
      } catch {}
      setStatus(msg);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setStep('code');
  };

  const verifyOtp = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setStatus('Supabase не настроен. Проверьте ключи.');
      return;
    }

    if (!code.trim()) {
      setStatus(channel === 'call' ? 'Введите код из звонка.' : 'Введите код из Telegram.');
      return;
    }

    setIsLoading(true);
    setStatus(null);

    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { phone, code }
    });

    if (error || data?.error || !data?.access_token) {
      setStatus(error?.message || data?.error || 'Неверный код.');
      setIsLoading(false);
      return;
    }

    setSessionToken(data.access_token, {
      userId: data.user_id,
      phone: data.phone,
      name: data.name
    });

    onSignedIn?.();
    setIsLoading(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Назад к поиску
      </button>

      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
            <PhoneIcon className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-stone-900">Вход по телефону</h1>
            <p className="text-xs text-stone-500">Получите код и войдите в личную библиотеку</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Номер телефона</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+7 900 000-00-00"
            className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-amber-500 focus:ring-amber-200 focus:outline-none"
            disabled={step === 'code'}
          />
        </div>

        {step === 'code' && (
          <div className="space-y-4">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              {channel === 'call' ? 'Код из звонка' : 'Код из Telegram'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="1234"
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:border-amber-500 focus:ring-amber-200 focus:outline-none"
            />
          </div>
        )}

        {status && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl px-4 py-3 text-sm">
            {status}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {step === 'phone' ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => requestOtp('telegram')}
                disabled={isLoading}
                className="w-full py-3 bg-stone-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-60"
              >
                {isLoading && channel === 'telegram' ? 'Отправляем...' : 'Получить код в Telegram'}
              </button>
              <button
                onClick={() => requestOtp('call')}
                disabled={isLoading}
                className="w-full py-3 bg-white text-stone-700 border border-stone-200 rounded-2xl font-bold hover:bg-stone-50 transition-all disabled:opacity-60"
              >
                {isLoading && channel === 'call' ? 'Звоним...' : 'Получить звонок с кодом'}
              </button>
            </div>
          ) : (
            <button
              onClick={verifyOtp}
              disabled={isLoading}
              className="w-full py-3 bg-amber-700 text-white rounded-2xl font-bold hover:bg-amber-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Проверяем...' : 'Войти'}
              <KeyIcon className="w-4 h-4" />
            </button>
          )}

          {step === 'code' && (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => requestOtp()}
                disabled={isLoading}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Отправить ещё раз
              </button>
              <span className="text-stone-300">|</span>
              <button
                onClick={() => setStep('phone')}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Изменить номер
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Auth;
