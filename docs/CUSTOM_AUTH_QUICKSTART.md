# Быстрый старт: Кастомная аутентификация через SMSC

## Что уже готово
- Таблица `otp_codes` создана.
- Edge Functions `request-otp` и `verify-otp` готовы.
- Клиент хранит JWT и передает его в Supabase.
- RxDB репликация работает с кастомным токеном.

## Шаг 1. Секреты
Минимальный набор для запуска OTP:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `SMSC_LOGIN`
- `SMSC_PASSWORD`
- `SMSC_SENDER`
- `SMSC_TEST`

Дополнительные параметры:
- `OTP_SECRET`
- `OTP_TTL_MINUTES`
- `OTP_LENGTH`
- `OTP_MAX_ATTEMPTS`
- `JWT_EXPIRES_IN`

Пример для локальной разработки:
```bash
supabase secrets set \
  SUPABASE_URL="ваш-supabase-url" \
  SUPABASE_SERVICE_ROLE_KEY="ваш-service-role-key" \
  SUPABASE_JWT_SECRET="ваш-jwt-secret" \
  SMSC_LOGIN="ваш-логин" \
  SMSC_PASSWORD="ваш-пароль" \
  SMSC_SENDER="BookClub" \
  SMSC_TEST="true" \
  OTP_SECRET="local-otp-secret" \
  OTP_TTL_MINUTES="5" \
  OTP_LENGTH="6" \
  OTP_MAX_ATTEMPTS="5" \
  JWT_EXPIRES_IN="30d"
```

## Шаг 2. Миграции
```bash
npx supabase db reset
```

## Шаг 3. Проверка
1. Запустите приложение: `npm run dev`.
2. Перейдите на страницу входа.
3. Введите номер телефона.
4. Если `SMSC_TEST=true`, код будет в логах `request-otp`.
5. Введите код и войдите.

## RLS и JWT
JWT содержит `sub` с номером телефона и подписывается `SUPABASE_JWT_SECRET`. RLS‑политики используют `request.jwt.claims`.

## Дальше
См. `docs/CUSTOM_AUTH_SETUP.md` для полной документации.
