-- Storage bucket for images (book covers, avatars)
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

-- Public read access to images bucket
create policy "Public read images"
on storage.objects for select
using (bucket_id = 'images');

-- Public write access to images bucket (demo-friendly)
create policy "Public insert images"
on storage.objects for insert
with check (bucket_id = 'images');

create policy "Public update images"
on storage.objects for update
using (bucket_id = 'images')
with check (bucket_id = 'images');

create policy "Public delete images"
on storage.objects for delete
using (bucket_id = 'images');
