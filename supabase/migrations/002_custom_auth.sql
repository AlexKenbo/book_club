-- Custom OTP auth support

create table if not exists otp_codes (
  id bigserial primary key,
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists otp_codes_phone_created_idx on otp_codes (phone, created_at desc);

alter table otp_codes enable row level security;

create unique index if not exists profiles_phone_number_idx on profiles (phone_number);
