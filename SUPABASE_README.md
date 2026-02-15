# Локальный Supabase

Этот проект поддерживает локальный Supabase для разработки и тестирования. Если Docker недоступен, приложение продолжит работать в локальном режиме без синхронизации.

## Предварительные требования
- Docker Desktop или Docker Engine.
- Supabase CLI (опционально), можно использовать `npx`.

## Запуск
1. Запустите локальный Supabase:

```bash
npx supabase start
```

2. Скопируйте `API URL` и `anon key` из вывода команды.
3. Обновите `SUPABASE_URL` и `SUPABASE_ANON_KEY` в `lib/supabaseClient.ts`.

## Миграции
```bash
npx supabase db reset
```

Создаются таблицы и RLS‑политики из `supabase/migrations`.
Также создается публичный bucket `images` для обложек книг и аватаров (Storage).

## Edge Functions
В проекте есть функции:
- `request-otp` — генерация и отправка OTP (SMSC).
- `verify-otp` — проверка OTP и выпуск JWT.
- `send-sms-hook` — пример SMS‑хука для Supabase Auth (опционально).

### Локальный запуск функций
```bash
supabase functions serve request-otp --env-file .env.local
supabase functions serve verify-otp --env-file .env.local
```

Пример `.env.local` для функций:
```bash
SUPABASE_URL=... 
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
SMSC_LOGIN=...
SMSC_PASSWORD=...
SMSC_SENDER=BookClub
SMSC_TEST=true
OTP_SECRET=local-otp-secret
OTP_TTL_MINUTES=5
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=5
JWT_EXPIRES_IN=30d
```

## Как работает синхронизация
- Приложение пишет данные в RxDB (IndexedDB в браузере).
- `replicateSupabase` синхронизирует `books`, `requests`, `profiles`.
- Если Supabase недоступен, приложение остается в локальном режиме.

## Studio
Админ‑панель Supabase Studio доступна по адресу `http://127.0.0.1:54323`.

## Полезные команды
- `npx supabase start` — запуск локального окружения.
- `npx supabase stop` — остановка.
- `npx supabase db reset` — сброс и применение миграций.
- `supabase secrets list` — список секретов.
