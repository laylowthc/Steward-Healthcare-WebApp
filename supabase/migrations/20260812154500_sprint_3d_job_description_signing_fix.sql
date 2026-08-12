-- Applicant signing needs only the active JD SELECT policy. A row lock would
-- additionally consult the admin-only UPDATE policy and hide the row.
create or replace function private.create_job_description_acknowledgement()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  selected_jd public.job_descriptions%rowtype;
  selected_role_name text;
begin
  if current_user not in ('postgres', 'service_role') and public.current_user_is_admin() then
    raise exception 'Administrators cannot sign a Job Description for an applicant';
  end if;
  select * into selected_jd from public.job_descriptions
  where id = new.job_description_id and active;
  if not found then
    raise exception 'The selected Job Description is not the current published version';
  end if;
  if not exists (
    select 1 from public.applicants a
    where a.id = new.applicant_id
      and a.user_id = (select auth.uid())
      and a.role_id = selected_jd.role_id
  ) then
    raise exception 'This Job Description does not match the applicant current role';
  end if;
  if new.signature_type not in ('typed', 'drawn')
     or btrim(coalesce(new.signature_value, '')) = ''
     or btrim(coalesce(new.signer_name, '')) = '' then
    raise exception 'A valid electronic signature and signer name are required';
  end if;
  select name into selected_role_name from public.roles where id = selected_jd.role_id;
  new.user_id := (select auth.uid());
  new.role_id := selected_jd.role_id;
  new.role_name := selected_role_name;
  new.jd_title := selected_jd.title;
  new.jd_version := selected_jd.version;
  new.jd_effective_date := selected_jd.effective_date;
  new.content_snapshot := selected_jd.content;
  new.acknowledgement_text := 'I confirm that I have read and understood this Job Description and understand the duties and responsibilities associated with my role.';
  new.acknowledgement_version := '1.0';
  new.signer_user_id := (select auth.uid());
  new.signed_at := now();
  new.created_at := now();
  return new;
end;
$$;

revoke all on function private.create_job_description_acknowledgement() from public, anon, authenticated;
