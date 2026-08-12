-- SHC StaffHub Sprint 3D: controlled role Job Descriptions and immutable acknowledgements.
-- Existing documents, applications, HR forms and signatures are preserved unchanged.

create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete restrict,
  title text not null,
  version text not null,
  effective_date date,
  content jsonb not null default '{"summary":"","reports_to":"","duties":[],"conduct":[]}'::jsonb,
  active boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, version)
);

create unique index if not exists job_descriptions_one_active_per_role_idx
  on public.job_descriptions(role_id) where active;
create index if not exists job_descriptions_role_created_idx
  on public.job_descriptions(role_id, created_at desc);
create index if not exists job_descriptions_created_by_idx
  on public.job_descriptions(created_by) where created_by is not null;

create table if not exists public.job_description_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  job_description_id uuid not null references public.job_descriptions(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  applicant_id uuid not null references public.applicants(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  role_name text not null,
  jd_title text not null,
  jd_version text not null,
  jd_effective_date date,
  content_snapshot jsonb not null,
  acknowledgement_text text not null,
  acknowledgement_version text not null default '1.0',
  signature_type text not null check (signature_type in ('typed', 'drawn')),
  signature_value text not null,
  signer_user_id uuid not null references public.users(id) on delete restrict,
  signer_name text not null,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, job_description_id)
);

create index if not exists job_description_ack_user_signed_idx
  on public.job_description_acknowledgements(user_id, signed_at desc);
create index if not exists job_description_ack_applicant_signed_idx
  on public.job_description_acknowledgements(applicant_id, signed_at desc);
create index if not exists job_description_ack_role_version_idx
  on public.job_description_acknowledgements(role_id, jd_version);
create index if not exists job_description_ack_jd_idx
  on public.job_description_acknowledgements(job_description_id);
create index if not exists job_description_ack_signer_idx
  on public.job_description_acknowledgements(signer_user_id);

create schema if not exists private;

create or replace function private.protect_job_description()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if current_user not in ('postgres', 'service_role') and not public.current_user_is_admin() then
    raise exception 'Only authorised administrators may manage Job Descriptions';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Job Description versions must be retained; disable them instead';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    if exists (
      select 1 from public.job_description_acknowledgements a
      where a.job_description_id = old.id
    ) and (
      new.role_id is distinct from old.role_id
      or new.title is distinct from old.title
      or new.version is distinct from old.version
      or new.effective_date is distinct from old.effective_date
      or new.content is distinct from old.content
    ) then
      raise exception 'Signed Job Description versions cannot be changed';
    end if;
  end if;
  if new.active and (
    btrim(new.title) = ''
    or btrim(new.version) = ''
    or jsonb_typeof(new.content->'duties') <> 'array'
    or jsonb_array_length(new.content->'duties') = 0
  ) then
    raise exception 'A published Job Description requires a title, version and at least one duty';
  end if;
  if new.active then
    update public.job_descriptions
    set active = false, updated_at = now()
    where role_id = new.role_id and id <> new.id and active;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

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

create or replace function private.reject_job_description_acknowledgement_changes()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  raise exception 'Signed Job Description acknowledgements are immutable';
end;
$$;

revoke all on function private.protect_job_description() from public, anon, authenticated;
revoke all on function private.create_job_description_acknowledgement() from public, anon, authenticated;
revoke all on function private.reject_job_description_acknowledgement_changes() from public, anon, authenticated;

drop trigger if exists protect_job_description on public.job_descriptions;
create trigger protect_job_description
before insert or update or delete on public.job_descriptions
for each row execute function private.protect_job_description();

drop trigger if exists create_job_description_acknowledgement on public.job_description_acknowledgements;
create trigger create_job_description_acknowledgement
before insert on public.job_description_acknowledgements
for each row execute function private.create_job_description_acknowledgement();

drop trigger if exists reject_job_description_acknowledgement_changes on public.job_description_acknowledgements;
create trigger reject_job_description_acknowledgement_changes
before update or delete on public.job_description_acknowledgements
for each row execute function private.reject_job_description_acknowledgement_changes();

alter table public.job_descriptions enable row level security;
alter table public.job_description_acknowledgements enable row level security;

create policy job_descriptions_select on public.job_descriptions
for select to authenticated
using (
  public.current_user_is_admin()
  or (active and exists (
    select 1 from public.applicants a
    where a.role_id = job_descriptions.role_id and a.user_id = (select auth.uid())
  ))
  or exists (
    select 1 from public.job_description_acknowledgements acknowledgement
    where acknowledgement.job_description_id = job_descriptions.id
      and acknowledgement.user_id = (select auth.uid())
  )
);

create policy job_descriptions_admin_insert on public.job_descriptions
for insert to authenticated
with check (public.current_user_is_admin());

create policy job_descriptions_admin_update on public.job_descriptions
for update to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy job_description_ack_select on public.job_description_acknowledgements
for select to authenticated
using ((select auth.uid()) = user_id or public.current_user_is_admin());

create policy job_description_ack_insert on public.job_description_acknowledgements
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.applicants a
    where a.id = applicant_id and a.user_id = (select auth.uid()) and a.role_id = role_id
  )
);

revoke all privileges on table public.job_descriptions, public.job_description_acknowledgements from anon;
revoke all privileges on table public.job_descriptions, public.job_description_acknowledgements from authenticated;
grant select, insert, update on table public.job_descriptions to authenticated;
grant select, insert on table public.job_description_acknowledgements to authenticated;
grant select, insert, update, delete on table public.job_descriptions, public.job_description_acknowledgements to service_role;

-- Publish only wording already present in the repository. No Nurse duties were found,
-- so Nurse v1.0 remains an inactive management draft until authoritative content is supplied.
insert into public.job_descriptions(role_id, title, version, content, active)
select id, 'Care Assistant / Care Worker Job Description', '1.0',
  jsonb_build_object(
    'summary', description,
    'reports_to', 'Home Manager / Care Co-ordinator / Branch Director',
    'duties', jsonb_build_array(
      'To assist in the provision of personal, physical, social and emotional care and support promoting independence and respecting dignity.',
      'To ensure that at all times the privacy, dignity, and confidentiality of all service users is carefully maintained.',
      'To advise, assist with, or perform personal care duties including washing, bathing, showering, oral/dental care, shaving, dressing.',
      'To observe, monitor and report on the condition of service users, noting and reporting any changes to the Care Co-ordinator / Manager.',
      'To assist with preparation and serving of meals and drinks, taking into account dietary requirements and cultural preferences.',
      'To collect prescriptions and assist with administration of medication strictly in accordance with Steward Medication Policy.',
      'To assist with household tasks such as bed making, tidying, dusting, polishing, cleaning bathrooms and doing laundry.',
      'To accompany service users on outings and social activities, and provide companionship/emotional support with extreme benevolence.',
      'To maintain accurate records and documentation as required by Steward Health Care, including daily logs, plan updates, and incident logs.',
      'To comply fully with all health and safety regulations and legislation, including COSHH, fire safety, and infection control procedures.'
    ),
    'conduct', jsonb_build_array(
      'Ensure the comfort, safeguarding and health standards of clients and report concerns immediately.',
      'Do not accept monetary personal gifts, tips or loans from clients.',
      'Wear the required clean uniform, official identification and protective equipment.',
      'Comply with confidentiality, GDPR and information-security requirements.'
    )
  ), true
from public.roles where slug = 'care-assistant-care-worker'
on conflict (role_id, version) do nothing;

insert into public.job_descriptions(role_id, title, version, content, active)
select id, 'Nurse Job Description', '1.0',
  jsonb_build_object('summary', description, 'reports_to', '', 'duties', '[]'::jsonb, 'conduct', '[]'::jsonb), false
from public.roles where slug = 'nurse'
on conflict (role_id, version) do nothing;

update public.role_requirements
set metadata = (metadata - 'document_category') || '{"completion_source":"job_description_acknowledgement"}'::jsonb,
    updated_at = now()
where active and requirement_key = 'job_description_ack';

comment on table public.job_descriptions is 'Controlled, role-specific Job Description versions. Signed versions cannot have controlled content changed.';
comment on table public.job_description_acknowledgements is 'Immutable applicant signatures with exact JD, role and acknowledgement snapshots.';
