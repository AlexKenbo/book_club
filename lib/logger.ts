import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const sendToSupabase = (level: LogLevel, message: string, context?: LogContext) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  const token = localStorage.getItem('libshare_access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body = {
    level,
    message,
    context: context ?? null,
    user_agent: navigator.userAgent,
  };

  // Fire-and-forget — не блокируем UI
  fetch(`${SUPABASE_URL}/rest/v1/app_logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }).catch(() => {
    // Молча игнорируем — если логирование сломалось, не ломаем приложение
  });
};

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(`[INFO] ${message}`, context ?? '');
  },

  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, context ?? '');
    sendToSupabase('warn', message, context);
  },

  error(message: string, context?: LogContext) {
    console.error(`[ERROR] ${message}`, context ?? '');
    sendToSupabase('error', message, context);
  },
};

export const initGlobalErrorHandlers = () => {
  window.onerror = (_message, source, lineno, colno, error) => {
    logger.error('Unhandled error', {
      message: error?.message ?? String(_message),
      stack: error?.stack,
      source,
      lineno,
      colno,
    });
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    logger.error('Unhandled promise rejection', {
      message: reason?.message ?? String(reason),
      stack: reason?.stack,
    });
  };
};
