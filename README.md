<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Книжный клуб ЦХМ

Веб‑приложение для распределенной домашней библиотеки: оцифровывайте свои книги, делитесь ими внутри сообщества, оформляйте запросы на выдачу и отслеживайте статус экземпляров. Приложение работает offline‑first за счет локальной базы в браузере и синхронизации через Supabase.

## Возможности
- Добавление книг с фото обложки и категорией.
- Лента поиска по книгам сообщества и запрос «Хочу почитать».
- Управление входящими запросами и статусами выдачи.
- Контакты сторон после одобрения запроса.
- Демо‑режим с тестовыми пользователями и данными.
- Offline‑first хранение (IndexedDB) и фоновая синхронизация.
- Экран восстановления при критической ошибке (Hard Reset).

## Быстрый старт
1. Установите зависимости:

```bash
npm install
```

2. Запустите приложение:

```bash
npm run dev
```

3. Откройте `http://localhost:3000`.

## Демо‑режим
Если Supabase не настроен или вы хотите быстро посмотреть сценарии, нажмите «Включить DEMO MODE» на экране входа. Демо‑режим создаст локальные данные и позволит переключаться между тестовыми пользователями.

## Supabase: облако и локальная разработка
Вариант A: Supabase Cloud (по умолчанию).
В `lib/supabaseClient.ts` уже задан URL и anon‑key проекта. Если используете свой проект, замените эти значения.

Вариант B: локальный Supabase.
1. Запустите локальный Supabase: `npx supabase start`.
2. Скопируйте `API URL` и `anon key` из вывода команды.
3. Обновите `SUPABASE_URL` и `SUPABASE_ANON_KEY` в `lib/supabaseClient.ts`.
4. Примените миграции: `npx supabase db reset`.

## Кастомная аутентификация (OTP через SMSC)
В проекте есть Edge Functions `request-otp` и `verify-otp`, которые выдают JWT для Supabase. Настройка секретов и SMSC описана в документации:
- `docs/CUSTOM_AUTH_QUICKSTART.md`
- `docs/CUSTOM_AUTH_SETUP.md`
- `docs/CUSTOM_AUTH_SUMMARY.md`

## Архитектура
- Локальные данные хранятся в RxDB поверх IndexedDB (Dexie). При ошибке хранения используется in‑memory хранилище.
- Синхронизация выполняется через `replicateSupabase` для коллекций `books`, `requests`, `profiles`.
- В `db.ts` есть мапперы `snake_case` ↔ `camelCase` для полей Supabase.
- Авторизация использует кастомный JWT, сохраненный в `localStorage`, и передается в заголовках Supabase клиента.

## Модель данных
- `books`: книги и их статус (`свободна`, `у кого-то`, `забронирована`).
- `requests`: запросы на выдачу (`ожидает`, `одобрено`, `отклонено`, `возвращено`).
- `profiles`: профиль пользователя (имя, email, телефон).

## Структура проекта
- `App.tsx` — маршрутизация, демо‑режим, инициализация данных и сессии.
- `db.ts` — схема RxDB, репликация с Supabase, маппинг полей.
- `lib/supabaseClient.ts` — клиент Supabase и хранение JWT.
- `pages/` — экраны приложения (библиотека, поиск, профиль, запросы, добавление книги, вход).
- `components/` — общие UI‑компоненты и layout.
- `services/` — сиды демо‑данных и тест‑раннер.
- `supabase/functions/` — edge‑функции OTP и SMS‑hook.
- `supabase/migrations/` — миграции схемы базы данных.
- `docs/` — продуктовая и техническая документация.

## Команды
- `npm run dev` — запуск dev‑сервера.
- `npm run build` — production‑сборка.
- `npm run preview` — предпросмотр production‑сборки.
- `npx supabase start` — локальный Supabase.
- `npx supabase db reset` — применить миграции локально.

## Документация
- `QUICK_START.md` — краткий старт и чеклист.
- `docs/INSTALLATION.md` — полная инструкция по установке.
- `SUPABASE_README.md` — локальный Supabase и функции.
- `docs/PRD.md` — продуктовые требования.
- `docs/USE_CASES.md` — сценарии использования.
- `docs/ARCHITECTURE.md` — архитектура и потоки данных.
- `docs/DEVELOPMENT.md` — разработка и соглашения.
- `docs/DEPLOYMENT.md` — деплой и окружения.
- `docs/CUSTOM_AUTH_QUICKSTART.md` — быстрый старт по OTP.
- `docs/CUSTOM_AUTH_SETUP.md` — полная настройка OTP/SMSC.
- `docs/CUSTOM_AUTH_SUMMARY.md` — архитектурный обзор кастомной аутентификации.

## Решение проблем
- Приложение не запускается: проверьте порт `3000` и логи dev‑сервера, либо смените порт в `vite.config.ts`.
- Supabase не доступен: проверьте `SUPABASE_URL` и `SUPABASE_ANON_KEY` в `lib/supabaseClient.ts`.
- Белый экран при загрузке: используйте Hard Reset в аварийном экране или очистите `IndexedDB` и `localStorage`.
- OTP не приходит: проверьте секреты через `supabase secrets list` и логи функции `request-otp`.

## Безопасность
Не коммитьте секреты Supabase и SMSC. Используйте `supabase secrets set` для локальной разработки и настройку Secrets в Supabase Dashboard для production.

## Лицензия
Лицензия проекта не указана.
