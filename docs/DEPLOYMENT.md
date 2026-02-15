# Деплой

## Frontend
Сборка выполняется Vite и может быть размещена на любом static‑hosting.

### Сборка
```bash
npm run build
```

Артефакты находятся в `dist/`.

### Предпросмотр
```bash
npm run preview
```

### SPA‑роутинг
Для хостинга нужен fallback на `index.html`, чтобы клиентские маршруты работали корректно.

## Supabase

### Миграции
Перед деплоем убедитесь, что миграции применены:
```bash
npx supabase db reset
```

### Edge Functions
```bash
supabase functions deploy request-otp --project-ref ваш-project-ref
supabase functions deploy verify-otp --project-ref ваш-project-ref
```

Функция `send-sms-hook` нужна только если вы используете Supabase Auth Hooks.

### Секреты
Секреты задаются через Supabase CLI или Dashboard:
```bash
supabase secrets set --project-ref ваш-project-ref \
  SUPABASE_URL="ваш-supabase-url" \
  SUPABASE_SERVICE_ROLE_KEY="ваш-service-role-key" \
  SUPABASE_JWT_SECRET="ваш-jwt-secret" \
  SMSC_LOGIN="ваш-логин" \
  SMSC_PASSWORD="ваш-пароль" \
  SMSC_SENDER="BookClub" \
  SMSC_TEST="false"
```

## Ключи для клиента
Публичный `anon key` можно хранить в коде. Если вы используете другой проект Supabase, обновите `SUPABASE_URL` и `SUPABASE_ANON_KEY` в `lib/supabaseClient.ts`.
