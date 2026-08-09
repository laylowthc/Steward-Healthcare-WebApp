-- SHC Sprint 2: structured, versioned official Application for Employment.
-- Safe to run after 20260718_sprint_1_workflow_persistence.sql.
-- This migration intentionally does not remove applicants.cv_data.

create table if not exists public.employment_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  position_applied text not null default '',
  vacancy_reference_location text not null default '',
  source_of_advertisement text not null default '',
  title text not null default '',
  forenames text not null default '',
  surname text not null default '',
  address text not null default '',
  postcode text not null default '',
  telephone text not null default '',
  mobile text not null default '',
  personal_email text not null default '',
  national_insurance_number text not null default '',
  eligible_to_work_uk boolean,
  nmc_pin text not null default '',
  rna text not null default '',
  nmc_expiry_date date,
  right_to_work text not null default '',
  enhanced_dbs text not null default '',
  dbs_issue_date date,
  recent_employer_name_address text not null default '',
  recent_employer_postcode text not null default '',
  recent_employer_telephone text not null default '',
  recent_employer_date_from date,
  recent_employer_date_to date,
  recent_employer_position_title text not null default '',
  recent_employer_primary_responsibilities text not null default '',
  recent_employer_salary text not null default '',
  recent_employer_notice_period text not null default '',
  recent_employer_reason_for_leaving text not null default '',
  employment_history jsonb not null default '[]'::jsonb,
  professional_references jsonb not null default '[]'::jsonb,
  referees_agreed_to_contact boolean not null default false,
  personal_statement text not null default '',
  knows_connected_person boolean,
  connected_person_details text not null default '',
  has_unprotected_criminal_record boolean,
  criminal_record_details text not null default '',
  declaration_confirmed boolean not null default false,
  references_checks_authorised boolean not null default false,
  satisfactory_checks_acknowledged boolean not null default false,
  data_protection_consent boolean not null default false,
  signature_type text not null default 'typed' check (signature_type in ('typed','drawn')),
  signature_value text not null default '',
  printed_name text not null default '',
  signature_date date,
  current_step integer not null default 1 check (current_step between 1 and 9),
  status text not null default 'Draft' check (status in ('Draft','Submitted','Under Review','Returned for Correction','Approved','Rejected')),
  revision integer not null default 1 check (revision > 0),
  reviewer_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (applicant_id)
);

create index if not exists employment_applications_user_id_idx on public.employment_applications(user_id);
create index if not exists employment_applications_applicant_id_idx on public.employment_applications(applicant_id);
create index if not exists employment_applications_status_idx on public.employment_applications(status);

create table if not exists public.employment_application_equal_opportunities (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.employment_applications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  vacancy_reference_number text not null default '',
  gender_identification text not null default '',
  age_band text not null default '',
  disability_declaration text not null default '',
  ethnic_origin text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employment_application_versions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.employment_applications(id) on delete cascade,
  revision integer not null,
  status text not null,
  snapshot jsonb not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(application_id, revision)
);

create or replace function public.set_employment_application_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end; $$;

drop trigger if exists set_employment_application_updated_at on public.employment_applications;
create trigger set_employment_application_updated_at before update on public.employment_applications
for each row execute function public.set_employment_application_updated_at();

create or replace function public.protect_submitted_employment_application()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.current_user_is_admin() and old.status not in ('Draft','Returned for Correction') then
    raise exception 'Submitted applications can only be edited after an administrator returns them for correction';
  end if;
  if not public.current_user_is_admin() then
    new.user_id=old.user_id; new.applicant_id=old.applicant_id;
    if old.status='Returned for Correction' and new.status='Submitted' then
      new.revision=old.revision+1;
    else
      new.revision=old.revision;
    end if;
    new.reviewer_notes=old.reviewer_notes;
    new.reviewed_at=old.reviewed_at; new.reviewed_by=old.reviewed_by;
    if new.status not in ('Draft','Submitted') then
      raise exception 'Applicants cannot set review status';
    end if;
  end if;
  if new.status='Submitted' and old.status is distinct from 'Submitted' then
    new.submitted_at=now();
  end if;
  return new;
end; $$;

drop trigger if exists protect_submitted_employment_application on public.employment_applications;
create trigger protect_submitted_employment_application before update on public.employment_applications
for each row execute function public.protect_submitted_employment_application();

create or replace function public.archive_employment_application_submission()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='Submitted' and old.status is distinct from 'Submitted' then
    insert into public.employment_application_versions(application_id,revision,status,snapshot,created_by)
    values(new.id,new.revision,new.status,to_jsonb(new)-'reviewer_notes',auth.uid())
    on conflict(application_id,revision) do update set status=excluded.status,snapshot=excluded.snapshot,created_by=excluded.created_by,created_at=now();
  end if;
  return new;
end; $$;

drop trigger if exists archive_employment_application_submission on public.employment_applications;
create trigger archive_employment_application_submission after update on public.employment_applications
for each row execute function public.archive_employment_application_submission();

alter table public.employment_applications enable row level security;
alter table public.employment_application_equal_opportunities enable row level security;
alter table public.employment_application_versions enable row level security;

create policy employment_applications_select on public.employment_applications for select
using(user_id=auth.uid() or public.current_user_is_admin());
create policy employment_applications_insert on public.employment_applications for insert
with check((user_id=auth.uid() and status='Draft') or public.current_user_is_admin());
create policy employment_applications_update on public.employment_applications for update
using(user_id=auth.uid() or public.current_user_is_admin())
with check(user_id=auth.uid() or public.current_user_is_admin());

create or replace function public.current_user_can_view_equal_opportunities()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.users u
    where u.id=auth.uid() and lower(u.role)='admin' and u.status='Active'
      and 'equal_opportunities:view'=any(coalesce(u.permissions,'{}'::text[]))
  );
$$;

-- Equal-opportunities answers are visible to their owner and specifically authorised admins only.
-- The ordinary recruitment UI deliberately never queries this table.
create policy employment_equal_opportunities_select on public.employment_application_equal_opportunities for select
using(user_id=auth.uid() or public.current_user_can_view_equal_opportunities());
create policy employment_equal_opportunities_insert on public.employment_application_equal_opportunities for insert
with check(user_id=auth.uid());
create policy employment_equal_opportunities_update on public.employment_application_equal_opportunities for update
using(user_id=auth.uid()) with check(user_id=auth.uid());

create policy employment_application_versions_select on public.employment_application_versions for select
using(public.current_user_is_admin() or exists(select 1 from public.employment_applications a where a.id=application_id and a.user_id=auth.uid()));

comment on table public.employment_application_equal_opportunities is
  'Confidential monitoring data. Do not join into ordinary recruitment assessment views.';
