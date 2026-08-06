-- Bucket public pour logo, cachet et signature
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "business_assets_public_read" on storage.objects;
create policy "business_assets_public_read"
on storage.objects for select
using (bucket_id = 'business-assets');

drop policy if exists "business_assets_insert_own" on storage.objects;
create policy "business_assets_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "business_assets_update_own" on storage.objects;
create policy "business_assets_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "business_assets_delete_own" on storage.objects;
create policy "business_assets_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
