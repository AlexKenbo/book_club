create table app_logs (
  id bigint generated always as identity primary key,
  level text not null,          -- 'error' | 'warn' | 'info'
  message text not null,
  context jsonb,                -- { userId, page, action, stack, ... }
  user_agent text,
  created_at timestamptz default now()
);

-- Любой авторизованный пользователь может писать логи, но не читать чужие
alter table app_logs enable row level security;
create policy "Anyone can insert logs" on app_logs for insert with check (true);
create policy "No one reads logs via API" on app_logs for select using (false);

-- Разрешаем INSERT для anon и authenticated ролей
grant insert on app_logs to anon, authenticated;

-- Индекс для автоочистки записей старше 30 дней
create index idx_app_logs_created_at on app_logs (created_at);
