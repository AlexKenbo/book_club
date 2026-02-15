# Инструкция по запуску приложения

## Предварительные требования
- Node.js 18+.
- npm или yarn.
- Docker, если хотите локальный Supabase.

## Шаг 1. Установка зависимостей
```bash
npm install
```

## Шаг 2. Запуск приложения
```bash
npm run dev
```

Приложение доступно по адресу `http://localhost:3000`.

## Шаг 3. Supabase

### Вариант A: Supabase Cloud
По умолчанию клиент уже настроен на Supabase Cloud. Если используете свой проект, замените `SUPABASE_URL` и `SUPABASE_ANON_KEY` в `lib/supabaseClient.ts`.

### Вариант B: локальный Supabase
1. Запустите локальный Supabase:

```bash
npx supabase start
```

2. Скопируйте `API URL` и `anon key` из вывода команды.
3. Обновите `SUPABASE_URL` и `SUPABASE_ANON_KEY` в `lib/supabaseClient.ts`.
4. Примените миграции:

```bash
npx supabase db reset
```

## Шаг 4. Кастомная аутентификация (OTP через SMSC)
Если нужен вход по телефону, используйте Edge Functions `request-otp` и `verify-otp`.

Основные секреты:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `SMSC_LOGIN`
- `SMSC_PASSWORD`
- `SMSC_SENDER`
- `SMSC_TEST`
- `OTP_SECRET`
- `OTP_TTL_MINUTES`
- `OTP_LENGTH`
- `OTP_MAX_ATTEMPTS`
- `JWT_EXPIRES_IN`

Подробно см. `docs/CUSTOM_AUTH_SETUP.md`.

## Команды
- `npm run dev` — запуск dev‑сервера.
- `npm run build` — production‑сборка.
- `npm run preview` — предпросмотр production‑сборки.
- `npx supabase start` — локальный Supabase.
- `npx supabase db reset` — применение миграций.

## Решение проблем

### Приложение не открывается
- Проверьте, что порт `3000` свободен.
- Перезапустите `npm run dev`.

### Supabase не доступен
- Проверьте `SUPABASE_URL` и `SUPABASE_ANON_KEY` в `lib/supabaseClient.ts`.

### OTP не работает
- Проверьте секреты через `supabase secrets list`.
- Посмотрите логи функций `request-otp` и `verify-otp`.

## Дальше
- `README.md` — основная документация.
- `SUPABASE_README.md` — локальный Supabase и функции.
- `docs/ARCHITECTURE.md` — архитектура и потоки данных.
- `docs/DEVELOPMENT.md` — разработка и соглашения.
- `docs/DEPLOYMENT.md` — деплой и инфраструктура.
