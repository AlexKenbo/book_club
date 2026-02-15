-- Demo seed data for Supabase (profiles, books, requests)
-- Safe to re-run: uses ON CONFLICT for id.

insert into profiles (id, name, email, phone_number, is_public)
values
  ('demo_user_librarian', 'Алексей Бивер', 'alex@example.com', '+7 (916) 123-45-67', true),
  ('demo_user_reader', 'Мария Кастелланос', 'maria@example.com', '+7 (903) 987-65-43', true),
  ('demo_user_fiction', 'Дмитрий Волков', 'dmitry@example.com', '+7 (999) 555-44-33', true)
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  phone_number = excluded.phone_number,
  is_public = excluded.is_public;

insert into books (
  id,
  owner_id,
  owner_name,
  image_url,
  category,
  status,
  current_borrower_id,
  current_borrower_name,
  created_at
)
values
  (
    'book_alex_1',
    'demo_user_librarian',
    'Алексей Бивер',
    'https://placehold.co/400x600/1f2937/ffffff?text=John+B',
    'Христианские',
    'свободна',
    null,
    null,
    (extract(epoch from now()) * 1000)::bigint - 500000
  ),
  (
    'book_alex_2',
    'demo_user_librarian',
    'Алексей Бивер',
    'https://placehold.co/400x600/f59e0b/ffffff?text=Lisa+B',
    'Христианские',
    'у кого-то',
    'demo_user_reader',
    'Мария Кастелланос',
    (extract(epoch from now()) * 1000)::bigint - 400000
  ),
  (
    'book_maria_1',
    'demo_user_reader',
    'Мария Кастелланос',
    'https://placehold.co/400x600/78350f/ffffff?text=Krest',
    'Христианские',
    'свободна',
    null,
    null,
    (extract(epoch from now()) * 1000)::bigint - 300000
  ),
  (
    'book_maria_2',
    'demo_user_reader',
    'Мария Кастелланос',
    'https://placehold.co/400x600/1e40af/ffffff?text=Dream',
    'Христианские',
    'у кого-то',
    'demo_user_librarian',
    'Алексей Бивер',
    (extract(epoch from now()) * 1000)::bigint - 250000
  ),
  (
    'book_dmitry_1',
    'demo_user_fiction',
    'Дмитрий Волков',
    'https://placehold.co/400x600/4338ca/ffffff?text=Sherlock',
    'Художественные',
    'свободна',
    null,
    null,
    (extract(epoch from now()) * 1000)::bigint - 200000
  ),
  (
    'book_dmitry_2',
    'demo_user_fiction',
    'Дмитрий Волков',
    'https://placehold.co/400x600/10b981/ffffff?text=LOTR',
    'Художественные',
    'свободна',
    null,
    null,
    (extract(epoch from now()) * 1000)::bigint - 150000
  )
on conflict (id) do update set
  owner_id = excluded.owner_id,
  owner_name = excluded.owner_name,
  image_url = excluded.image_url,
  category = excluded.category,
  status = excluded.status,
  current_borrower_id = excluded.current_borrower_id,
  current_borrower_name = excluded.current_borrower_name,
  created_at = excluded.created_at;

insert into requests (
  id,
  book_id,
  book_image_url,
  lender_id,
  lender_name,
  lender_phone,
  borrower_id,
  borrower_name,
  borrower_phone,
  status,
  requested_at
)
values
  (
    'req_1',
    'book_alex_2',
    'https://placehold.co/400x600/f59e0b/ffffff?text=Lisa+B',
    'demo_user_librarian',
    'Алексей Бивер',
    '+7 (916) 123-45-67',
    'demo_user_reader',
    'Мария Кастелланос',
    '+7 (903) 987-65-43',
    'одобрено',
    (extract(epoch from now()) * 1000)::bigint - 240000
  ),
  (
    'req_2',
    'book_maria_2',
    'https://placehold.co/400x600/1e40af/ffffff?text=Dream',
    'demo_user_reader',
    'Мария Кастелланос',
    '+7 (903) 987-65-43',
    'demo_user_librarian',
    'Алексей Бивер',
    '+7 (916) 123-45-67',
    'одобрено',
    (extract(epoch from now()) * 1000)::bigint - 230000
  ),
  (
    'req_3',
    'book_dmitry_1',
    'https://placehold.co/400x600/4338ca/ffffff?text=Sherlock',
    'demo_user_fiction',
    'Дмитрий Волков',
    '+7 (999) 555-44-33',
    'demo_user_reader',
    'Мария Кастелланос',
    '+7 (903) 987-65-43',
    'ожидает',
    (extract(epoch from now()) * 1000)::bigint - 120000
  )
on conflict (id) do update set
  book_id = excluded.book_id,
  book_image_url = excluded.book_image_url,
  lender_id = excluded.lender_id,
  lender_name = excluded.lender_name,
  lender_phone = excluded.lender_phone,
  borrower_id = excluded.borrower_id,
  borrower_name = excluded.borrower_name,
  borrower_phone = excluded.borrower_phone,
  status = excluded.status,
  requested_at = excluded.requested_at;
