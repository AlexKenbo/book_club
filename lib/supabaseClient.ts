import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// ==========================================
// НАСТРОЙКИ SUPABASE CLOUD
// ==========================================

// Читаем из переменных окружения (задаются в .env.local)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const ACCESS_TOKEN_KEY = 'libshare_access_token';
const USER_ID_KEY = 'libshare_user_id';
const USER_PHONE_KEY = 'libshare_user_phone';
const USER_NAME_KEY = 'libshare_user_name';

let supabaseInstance: any = null;

export type StoredSession = {
    token: string;
    userId: string;
    phone?: string | null;
    name?: string | null;
};

const readStorageValue = (key: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
};

export const getStoredSession = (): StoredSession | null => {
    const token = readStorageValue(ACCESS_TOKEN_KEY);
    if (!token) return null;

    return {
        token,
        userId: readStorageValue(USER_ID_KEY) || '',
        phone: readStorageValue(USER_PHONE_KEY),
        name: readStorageValue(USER_NAME_KEY)
    };
};

export const setSessionToken = (token: string | null, payload?: { userId?: string; phone?: string; name?: string }) => {
    if (typeof window === 'undefined') return;

    if (!token) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(USER_PHONE_KEY);
        localStorage.removeItem(USER_NAME_KEY);
        supabaseInstance = null;
        return;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (payload?.userId) localStorage.setItem(USER_ID_KEY, payload.userId);
    if (payload?.phone) localStorage.setItem(USER_PHONE_KEY, payload.phone);
    if (payload?.name) localStorage.setItem(USER_NAME_KEY, payload.name);

    supabaseInstance = null;
};

export const getSupabase = () => {
    // Если ключи не заполнены, приложение работает локально (Offline mode)
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        logger.info('Supabase credentials missing, running in Offline mode');
        return null;
    }

    if (!supabaseInstance) {
        try {
            const session = getStoredSession();
            const headers: Record<string, string> = {};
            if (session?.token) {
                headers.Authorization = `Bearer ${session.token}`;
            }

            supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                },
                global: {
                    headers
                }
            });

            if (session?.token) {
                supabaseInstance.realtime.setAuth(session.token);
            }
        } catch (error) {
            logger.error('Error initializing Supabase client', { error: String(error) });
            return null;
        }
    }
    return supabaseInstance;
};
