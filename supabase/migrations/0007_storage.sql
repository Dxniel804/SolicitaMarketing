-- 0007_storage.sql
-- Private bucket for request attachments + storage-level RLS policies.
--
-- Path convention: request-attachments/{requester_id}/{uuid}-{original_filename}
-- Folder is keyed by the UPLOADING USER's id, not the request id, because at
-- upload time (while filling out "Nova solicitação") the request row does not
-- exist yet. Table-level RLS on public.request_files (0003) is what actually
-- gates "which files belong to which request" once the request is created;
-- this bucket policy only needs to answer "can this user read/write this
-- raw object," which "owns the folder" answers cleanly.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-attachments',
  'request-attachments',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'video/mp4',
    'application/zip'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "attachments_insert_own_folder" on storage.objects;
create policy "attachments_insert_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'request-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role_name() = 'admin'
    )
  );

drop policy if exists "attachments_select_own_or_admin" on storage.objects;
create policy "attachments_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'request-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role_name() = 'admin'
    )
  );

drop policy if exists "attachments_delete_own_or_admin" on storage.objects;
create policy "attachments_delete_own_or_admin" on storage.objects
  for delete using (
    bucket_id = 'request-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role_name() = 'admin'
    )
  );
