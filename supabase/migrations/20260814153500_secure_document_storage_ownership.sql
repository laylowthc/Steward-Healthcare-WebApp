-- Keep the private documents bucket private between authenticated users while
-- preserving authorised administrator review and deletion access.
drop policy if exists "Authenticated users can read documents" on storage.objects;
create policy "Authenticated users can read documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and (
    owner = (select auth.uid())
    or (select public.current_user_is_admin())
  )
);

drop policy if exists "Authenticated users can upload documents" on storage.objects;
create policy "Authenticated users can upload documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and owner = (select auth.uid())
);

drop policy if exists "Authenticated users can update documents" on storage.objects;
create policy "Authenticated users can update documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'documents'
  and (
    owner = (select auth.uid())
    or (select public.current_user_is_admin())
  )
)
with check (
  bucket_id = 'documents'
  and (
    owner = (select auth.uid())
    or (select public.current_user_is_admin())
  )
);

drop policy if exists "Authenticated users can delete documents" on storage.objects;
create policy "Authenticated users can delete documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and (
    owner = (select auth.uid())
    or (select public.current_user_is_admin())
  )
);
