-- Разрешаем анонимный INSERT в profiles для гостевых профилей (is_public = false)
create policy "Guests can create non-public profiles" on profiles
  for insert
  with check (is_public = false);

-- Разрешаем анонимный INSERT в requests для гостевых запросов
create policy "Guests can create requests" on requests
  for insert
  with check (true);
