-- Make email optional for profiles (phone-only auth)
alter table profiles alter column email drop not null;
