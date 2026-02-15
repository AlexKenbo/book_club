-- Sessions table for managing user sessions (optional but recommended)
-- This allows tracking active sessions and implementing logout functionality

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(id) on delete cascade,
  token_hash text not null, -- SHA-256 hash of the JWT token
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  user_agent text,
  ip_address text,
  revoked boolean not null default false
);

create index if not exists sessions_user_id_idx on sessions (user_id);
create index if not exists sessions_token_hash_idx on sessions (token_hash);
create index if not exists sessions_expires_at_idx on sessions (expires_at);
-- Postgres требует IMMUTABLE в предикате индекса, поэтому без now()
create index if not exists sessions_active_idx on sessions (user_id, expires_at)
  where revoked = false;

-- Function to clean up expired sessions (can be called periodically)
create or replace function cleanup_expired_sessions()
returns void as $$
begin
  delete from sessions
  where expires_at < now() - interval '7 days';
end;
$$ language plpgsql;

-- Enable RLS on sessions
alter table sessions enable row level security;

-- Users can only see their own sessions
create policy "Users can view own sessions" on sessions
  for select
  using (
    user_id = coalesce(
      nullif(current_setting('request.jwt.claims', true)::json->>'sub', ''),
      nullif(current_setting('request.jwt.claims', true)::json->>'user_id', '')
    )
  );

-- Only service role can insert/update/delete sessions
-- (This should be done from edge functions with service role key)
create policy "Service role manages sessions" on sessions
  for all
  using (false)
  with check (false);
