-- Add avatar URL to profiles
alter table profiles add column if not exists avatar_url text;
