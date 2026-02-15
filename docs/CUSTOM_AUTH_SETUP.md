# Настройка кастомной аутентификации через SMSC

Этот проект использует собственный OTP‑поток через SMSC. Supabase остается источником данных и realtime‑каналом, а JWT подписывается секретом Supabase.

## Архитектура
- Аутентификация: кастомный OTP через SMSC.
- JWT: подписывается `SUPABASE_JWT_SECRET`.
- База данных: Supabase Postgres с RLS.
- Realtime: Supabase Realtime с кастомным JWT.
- Репликация: RxDB → Supabase через `replicateSupabase`.

## Секреты

### Обязательные
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `SMSC_LOGIN`
- `SMSC_PASSWORD`
- `SMSC_SENDER`
- `SMSC_TEST`

### Дополнительные
- `OTP_SECRET` — соль для хеширования OTP.
- `OTP_TTL_MINUTES` — TTL кода.
- `OTP_LENGTH` — длина кода.
- `OTP_MAX_ATTEMPTS` — лимит попыток.
- `JWT_EXPIRES_IN` — TTL JWT.

### Локальная разработка
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

### Production (Supabase Cloud)
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

Также можно задать секреты через Supabase Dashboard → Project Settings → Edge Functions → Secrets.

## Миграции
```bash
npx supabase db reset
```

Миграции находятся в `supabase/migrations`.

## Как работает поток OTP
1. `request-otp` генерирует код, хеширует его и сохраняет в `otp_codes`.
2. Код отправляется через SMSC.
3. `verify-otp` проверяет код, создает профиль и выпускает JWT.
4. Клиент сохраняет JWT и передает его в `Authorization`.

## JWT
JWT содержит:
- `role: authenticated`
- `aud: authenticated`
- `sub: <phone>`
- `phone: <phone>`
- `app_metadata.provider: smsc`
- `user_metadata.name: <name>`

## RLS
RLS‑политики используют `request.jwt.claims->>'sub'` для доступа к данным.

## Логи и отладка
- Локально: `supabase functions serve request-otp --env-file .env.local`.
- Production: `supabase functions logs request-otp --project-ref ваш-project-ref`.

## Troubleshooting

### Invalid JWT
- Проверьте `SUPABASE_JWT_SECRET`.
- Убедитесь, что токен содержит `role`, `aud`, `sub`.

### RLS блокирует запросы
- Проверьте заголовок `Authorization`.
- Проверьте совпадение `sub` и `profiles.id`.
- Для отладки временно отключите RLS.

## Безопасность
- Не коммитьте секреты.
- Используйте `supabase secrets set` или Dashboard.
- Ограничьте `SUPABASE_SERVICE_ROLE_KEY` только для Edge Functions.
