-- SHC StaffHub Sprint 3C: persistent, versioned HR onboarding forms.
-- Existing documents, applications, signatures and application versions are untouched.

create table if not exists public.hr_onboarding_forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  role_id uuid references public.roles(id) on delete set null,
  form_type text not null check (form_type in (
    'starter_information', 'bank_details', 'paye_declaration',
    'next_of_kin', 'working_time_declaration', 'policy_acknowledgement'
  )),
  status text not null default 'Draft' check (status in (
    'Draft', 'Submitted', 'Returned for Correction', 'Approved', 'Rejected'
  )),
  form_data jsonb not null default '{}'::jsonb,
  current_revision integer not null default 1 check (current_revision > 0),
  signature_type text check (signature_type in ('typed', 'drawn')),
  signature_value text,
  signer_user_id uuid references public.users(id) on delete set null,
  signer_name text,
  signed_at timestamptz,
  submitted_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, form_type)
);

create table if not exists public.hr_onboarding_form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.hr_onboarding_forms(id) on delete cascade,
  revision integer not null check (revision > 0),
  status text not null default 'Submitted' check (status = 'Submitted'),
  snapshot jsonb not null,
  signature_type text check (signature_type in ('typed', 'drawn')),
  signature_value text,
  signer_user_id uuid references public.users(id) on delete set null,
  signer_name text,
  signed_at timestamptz,
  submitted_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (form_id, revision)
);

create index if not exists hr_onboarding_forms_user_status_idx
  on public.hr_onboarding_forms(user_id, status);
create index if not exists hr_onboarding_forms_applicant_status_idx
  on public.hr_onboarding_forms(applicant_id, status);
create index if not exists hr_onboarding_forms_role_type_idx
  on public.hr_onboarding_forms(role_id, form_type);
create index if not exists hr_onboarding_forms_reviewed_by_idx
  on public.hr_onboarding_forms(reviewed_by) where reviewed_by is not null;
create index if not exists hr_onboarding_form_versions_signer_idx
  on public.hr_onboarding_form_versions(signer_user_id) where signer_user_id is not null;

create schema if not exists private;

create or replace function private.protect_hr_onboarding_form()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  is_admin boolean := public.current_user_is_admin();
  signature_required boolean;
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if not is_admin then
      new.user_id := (select auth.uid());
      new.status := 'Draft';
      new.current_revision := 1;
      new.submitted_at := null;
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.reviewer_notes := null;
      if not exists (
        select 1 from public.applicants a
        where a.id = new.applicant_id and a.user_id = (select auth.uid())
      ) then
        raise exception 'Applicant may create HR forms only for their own applicant record';
      end if;
    end if;
    return new;
  end if;

  new.user_id := old.user_id;
  new.applicant_id := old.applicant_id;
  new.form_type := old.form_type;
  new.created_at := old.created_at;

  if is_admin then
    if old.status in ('Approved', 'Rejected') then
      raise exception 'Approved or rejected HR forms are immutable';
    end if;
    new.form_data := old.form_data;
    new.current_revision := old.current_revision;
    new.signature_type := old.signature_type;
    new.signature_value := old.signature_value;
    new.signer_user_id := old.signer_user_id;
    new.signer_name := old.signer_name;
    new.signed_at := old.signed_at;
    new.submitted_at := old.submitted_at;
    if old.status <> 'Submitted' or new.status not in ('Submitted', 'Returned for Correction', 'Approved', 'Rejected') then
      raise exception 'Administrators may review only submitted HR forms';
    end if;
    if new.status = 'Returned for Correction' and btrim(coalesce(new.reviewer_notes, '')) = '' then
      raise exception 'Reviewer notes are required when returning an HR form';
    end if;
    if new.status is distinct from old.status then
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
    end if;
    return new;
  end if;

  if old.user_id <> (select auth.uid()) then
    raise exception 'Applicants may update only their own HR forms';
  end if;
  if old.status not in ('Draft', 'Returned for Correction') then
    raise exception 'Submitted and approved HR forms are read-only';
  end if;
  if (old.status = 'Draft' and new.status not in ('Draft', 'Submitted'))
     or (old.status = 'Returned for Correction' and new.status not in ('Returned for Correction', 'Submitted')) then
    raise exception 'Invalid applicant HR form status transition';
  end if;

  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.reviewer_notes := old.reviewer_notes;
  new.current_revision := old.current_revision;

  if new.status = 'Submitted' and old.status is distinct from 'Submitted' then
    signature_required := new.form_type in (
      'starter_information', 'bank_details', 'paye_declaration',
      'working_time_declaration', 'policy_acknowledgement'
    );
    if signature_required and (
      new.signature_type is null
      or btrim(coalesce(new.signature_value, '')) = ''
      or btrim(coalesce(new.signer_name, '')) = ''
    ) then
      raise exception 'This HR form requires an electronic signature';
    end if;
    if old.status = 'Returned for Correction' then
      new.current_revision := old.current_revision + 1;
    end if;
    new.signer_user_id := case when signature_required then (select auth.uid()) else null end;
    new.signed_at := case when signature_required then now() else null end;
    new.submitted_at := now();
    new.reviewer_notes := null;
  end if;
  return new;
end;
$$;

create or replace function private.archive_hr_onboarding_submission()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.status = 'Submitted' and old.status is distinct from 'Submitted' then
    insert into public.hr_onboarding_form_versions (
      form_id, revision, status, snapshot, signature_type, signature_value,
      signer_user_id, signer_name, signed_at, submitted_at
    ) values (
      new.id, new.current_revision, 'Submitted',
      jsonb_build_object(
        'form_type', new.form_type,
        'form_data', new.form_data,
        'role_id', new.role_id,
        'user_id', new.user_id,
        'applicant_id', new.applicant_id
      ),
      new.signature_type, new.signature_value, new.signer_user_id,
      new.signer_name, new.signed_at, new.submitted_at
    );
  end if;
  return new;
end;
$$;

revoke all on function private.protect_hr_onboarding_form() from public, anon, authenticated;
revoke all on function private.archive_hr_onboarding_submission() from public, anon, authenticated;

drop trigger if exists protect_hr_onboarding_form on public.hr_onboarding_forms;
create trigger protect_hr_onboarding_form
before insert or update on public.hr_onboarding_forms
for each row execute function private.protect_hr_onboarding_form();

drop trigger if exists archive_hr_onboarding_submission on public.hr_onboarding_forms;
create trigger archive_hr_onboarding_submission
after update on public.hr_onboarding_forms
for each row execute function private.archive_hr_onboarding_submission();

alter table public.hr_onboarding_forms enable row level security;
alter table public.hr_onboarding_form_versions enable row level security;

create policy hr_onboarding_forms_select on public.hr_onboarding_forms
for select to authenticated
using ((select auth.uid()) = user_id or public.current_user_is_admin());

create policy hr_onboarding_forms_insert on public.hr_onboarding_forms
for insert to authenticated
with check (
  ((select auth.uid()) = user_id and status = 'Draft' and exists (
    select 1 from public.applicants a
    where a.id = applicant_id and a.user_id = (select auth.uid())
  ))
  or public.current_user_is_admin()
);

create policy hr_onboarding_forms_update on public.hr_onboarding_forms
for update to authenticated
using ((select auth.uid()) = user_id or public.current_user_is_admin())
with check ((select auth.uid()) = user_id or public.current_user_is_admin());

create policy hr_onboarding_form_versions_select on public.hr_onboarding_form_versions
for select to authenticated
using (
  public.current_user_is_admin()
  or exists (
    select 1 from public.hr_onboarding_forms f
    where f.id = form_id and f.user_id = (select auth.uid())
  )
);

revoke all privileges on table public.hr_onboarding_forms, public.hr_onboarding_form_versions from anon;
revoke all privileges on table public.hr_onboarding_forms, public.hr_onboarding_form_versions from authenticated;
grant select, insert, update on table public.hr_onboarding_forms to authenticated;
grant select on table public.hr_onboarding_form_versions to authenticated;
grant select, insert, update, delete on table public.hr_onboarding_forms, public.hr_onboarding_form_versions to service_role;

-- Map the existing Sprint 3A onboarding requirements to persistent form types.
update public.role_requirements
set requirement_type = 'hr_form',
    metadata = (metadata - 'document_categories' - 'document_category') || case requirement_key
      when 'starter_paye_forms' then '{"form_types":["starter_information","paye_declaration"]}'::jsonb
      when 'bank_details' then '{"form_types":["bank_details"],"sensitive":true}'::jsonb
      when 'next_of_kin' then '{"form_types":["next_of_kin"],"sensitive":true}'::jsonb
      when 'employment_declarations' then '{
        "form_types":["working_time_declaration","policy_acknowledgement"],
        "policies":[
          {"key":"confidentiality","name":"Confidentiality Agreement","version":"1.0","statement":"I will protect confidential information relating to service users, colleagues and SHC and disclose it only when authorised or legally required."},
          {"key":"data_protection","name":"Data Protection and Privacy Policy","version":"1.0","statement":"I have read and understood my responsibilities for handling personal data securely and reporting any suspected data breach."},
          {"key":"staff_handbook","name":"SHC Staff Handbook and Code of Conduct","version":"1.0","statement":"I have read and understood the standards of conduct, safeguarding and professional behaviour expected by SHC."}
        ]
      }'::jsonb
      else '{}'::jsonb
    end,
    updated_at = now()
where active
  and requirement_key in ('starter_paye_forms', 'bank_details', 'next_of_kin', 'employment_declarations')
  and role_id in (select id from public.roles where slug in ('nurse', 'care-assistant-care-worker'));

comment on table public.hr_onboarding_forms is
  'Sensitive, owner/admin-only current HR onboarding records. Do not include in broad applicant list queries.';
comment on table public.hr_onboarding_form_versions is
  'Immutable snapshots created whenever an applicant submits or resubmits an HR onboarding form.';
