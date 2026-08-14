-- Cache identity/admin checks once per statement rather than once per document row.
drop policy if exists "Users can read own documents" on public.documents;
create policy "Users can read own documents"
on public.documents for select
using (
  user_id = (select auth.uid())
  or (select public.current_user_is_admin())
);

drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents"
on public.documents for insert
with check (
  user_id = (select auth.uid())
  or (select public.current_user_is_admin())
);

drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
on public.documents for update
using (
  user_id = (select auth.uid())
  or (select public.current_user_is_admin())
)
with check (
  user_id = (select auth.uid())
  or (select public.current_user_is_admin())
);

drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents"
on public.documents for delete
using (
  user_id = (select auth.uid())
  or (select public.current_user_is_admin())
);
