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

  const requestOtp = async () => {
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

    const { data, error } = await supabase.functions.invoke('request-otp', {
      body: { phone }
    });

    if (error || data?.error) {
      setStatus(error?.message || data?.error || 'Ошибка отправки кода.');
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
      setStatus('Введите код из SMS.');
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
            <p className="text-xs text-stone-500">Получите код и войдите в личную библиотеку.</p>
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
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Код из SMS</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="123456"
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
            <button
              onClick={requestOtp}
              disabled={isLoading}
              className="w-full py-3 bg-stone-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-60"
            >
              {isLoading ? 'Отправляем...' : 'Получить код'}
            </button>
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
            <button
              onClick={() => setStep('phone')}
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              Изменить номер
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default Auth;
