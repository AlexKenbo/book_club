
-- Enable UUID extension (optional, if we want to switch to UUIDs later, but we use string IDs for now)
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table profiles (
  id text primary key,
  name text not null,
  email text not null,
  phone_number text,
  is_public boolean default true,
  updated_at timestamptz default now(),
  _deleted boolean default false
);

-- 2. Books Table
create table books (
  id text primary key,
  owner_id text references profiles(id),
  owner_name text,
  image_url text,
  category text,
  status text,
  current_borrower_id text,
  current_borrower_name text,
  created_at bigint, -- Keeping as number/bigint to match RxDB schema
  updated_at timestamptz default now(),
  _deleted boolean default false
);

-- 3. Requests Table
create table requests (
  id text primary key,
  book_id text references books(id),
  book_image_url text,
  lender_id text references profiles(id),
  lender_name text,
  lender_phone text,
  borrower_id text references profiles(id),
  borrower_name text,
  borrower_phone text,
  status text,
  requested_at bigint,
  updated_at timestamptz default now(),
  _deleted boolean default false
);

-- Row Level Security (RLS) Policies (Example: Public for Demo, Restricted for Prod)
-- For the demo purpose, we enable public access. In production, connect this to auth.uid()

alter table profiles enable row level security;
alter table books enable row level security;
alter table requests enable row level security;

-- Allow everything for now (Mock Mode compatible)
create policy "Public profiles access" on profiles for all using (true);
create policy "Public books access" on books for all using (true);
create policy "Public requests access" on requests for all using (true);

-- Function to auto-update updated_at on change
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_profiles_updated_at before update on profiles
for each row execute procedure update_updated_at_column();

create trigger update_books_updated_at before update on books
for each row execute procedure update_updated_at_column();

create trigger update_requests_updated_at before update on requests
for each row execute procedure update_updated_at_column();
