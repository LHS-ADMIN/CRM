-- Public profile images only. User private documents remain in crm-uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy profile_images_public_read
on storage.objects for select
to public
using (bucket_id = 'profile-images');

create policy profile_images_insert_own_folder
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

create policy profile_images_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-images'
  and owner_id = (select auth.jwt()->>'sub')
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

create policy profile_images_delete_own_or_admin
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (
    owner_id = (select auth.jwt()->>'sub')
    or private.is_admin()
  )
);
