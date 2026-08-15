-- Sprint 4A: additive, auditable pre-employment compliance workflow.
-- This migration is intentionally not applied to the frozen production project.

create table if not exists public.compliance_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  applicant_id uuid references public.applicants(id) on delete restrict,
  staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  lifecycle_state text not null default 'Applicant',
  overall_status text not null default 'Not Started'
    check (overall_status in ('Not Started','In Progress','Review Required','Satisfied')),
  manager_clearance_status text not null default 'Pending'
    check (manager_clearance_status in ('Pending','On Hold','Cleared','Not Cleared')),
  deployment_eligible boolean not null default false,
  manager_cleared_by uuid references auth.users(id) on delete restrict,
  manager_cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create table if not exists public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  compliance_case_id uuid not null references public.compliance_cases(id) on delete restrict,
  role_requirement_id uuid references public.role_requirements(id) on delete restrict,
  requirement_key text not null check (btrim(requirement_key) <> ''),
  display_name text not null check (btrim(display_name) <> ''),
  stage text not null default 'deployment'
    check (stage in ('application','onboarding','deployment')),
  responsible_party text not null
    check (responsible_party in ('applicant','administrator')),
  source_kind text not null default 'office_verification'
    check (source_kind in ('derived','document','office_verification','professional_registration','manager_clearance')),
  status text not null default 'Not Started'
    check (status in (
      'Not Required','Not Started','Awaiting Applicant','Evidence Received','Awaiting Review',
      'Verification In Progress','Verified','Concern / Review Required','Expiring','Expired',
      'Failed / Unsatisfactory','Waived / Exception Approved'
    )),
  evidence_document_id uuid references public.documents(id) on delete restrict,
  evidence_received_at timestamptz,
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  expiry_date date,
  is_blocking boolean not null default true,
  applicant_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (compliance_case_id, requirement_key)
);

-- Confidential verification fields are isolated from applicant-readable status rows.
create table if not exists public.compliance_verification_details (
  compliance_record_id uuid primary key references public.compliance_records(id) on delete restrict,
  evidence_type text,
  evidence_reference text,
  check_performed boolean not null default false,
  check_date date,
  outcome text,
  concern_present boolean not null default false,
  risk_assessment_status text
    check (risk_assessment_status is null or risk_assessment_status in (
      'Not Required','Required','In Progress','Suitable','Unsuitable'
    )),
  occupational_health_status text
    check (occupational_health_status is null or occupational_health_status in (
      'Declaration Received','Referral Required','Clearance Pending','Cleared','Restrictions / Adjustments Recorded'
    )),
  share_code_reference text,
  certificate_number text,
  issue_date date,
  registration_body text,
  registration_type text,
  internal_notes text not null default '',
  updated_by uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table if not exists public.reference_verifications (
  id uuid primary key default gen_random_uuid(),
  compliance_case_id uuid not null references public.compliance_cases(id) on delete restrict,
  reference_number smallint not null check (reference_number in (1, 2)),
  application_reference_index smallint check (application_reference_index is null or application_reference_index >= 0),
  referee_name_snapshot text not null default '',
  referee_organisation_snapshot text not null default '',
  requested_at timestamptz,
  received_at timestamptz,
  employment_dates_confirmed boolean not null default false,
  reason_for_leaving_confirmed boolean not null default false,
  signer_name text not null default '',
  signer_role text not null default '',
  telephone_verified boolean not null default false,
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  outcome text not null default 'Pending'
    check (outcome in ('Pending','Satisfactory','Concern Identified','Unsatisfactory')),
  supporting_document_id uuid references public.documents(id) on delete restrict,
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (compliance_case_id, reference_number)
);

create table if not exists public.compliance_events (
  id uuid primary key default gen_random_uuid(),
  compliance_case_id uuid not null references public.compliance_cases(id) on delete restrict,
  compliance_record_id uuid references public.compliance_records(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  action text not null,
  previous_state text,
  new_state text,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists compliance_cases_user_idx on public.compliance_cases(user_id);
create index if not exists compliance_cases_applicant_idx on public.compliance_cases(applicant_id) where applicant_id is not null;
create index if not exists compliance_cases_role_status_idx on public.compliance_cases(role_id, overall_status);
create index if not exists compliance_records_case_status_idx on public.compliance_records(compliance_case_id, status);
create index if not exists compliance_records_requirement_idx on public.compliance_records(role_requirement_id) where role_requirement_id is not null;
create index if not exists compliance_records_document_idx on public.compliance_records(evidence_document_id) where evidence_document_id is not null;
create index if not exists reference_verifications_case_idx on public.reference_verifications(compliance_case_id);
create index if not exists compliance_events_case_created_idx on public.compliance_events(compliance_case_id, created_at desc);
create index if not exists compliance_events_record_created_idx on public.compliance_events(compliance_record_id, created_at desc) where compliance_record_id is not null;

create or replace function private.touch_sprint_4a_updated_at()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.audit_compliance_record_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.compliance_events(
      compliance_case_id, compliance_record_id, actor_user_id, action, new_state
    ) values (new.compliance_case_id, new.id, auth.uid(), 'Requirement created', new.status);
  end if;
  return new;
end;
$$;

create or replace function public.admin_update_compliance_record(
  target_record_id uuid,
  next_status text,
  next_applicant_message text default '',
  next_evidence_document_id uuid default null,
  next_expiry_date date default null,
  change_reason text default ''
)
returns public.compliance_records
language plpgsql
security definer
set search_path = public, private
as $$
declare
  prior public.compliance_records%rowtype;
  changed public.compliance_records%rowtype;
begin
  if not public.current_user_is_admin() then
    raise exception 'Only an active administrator may update compliance verification';
  end if;
  select * into prior from public.compliance_records where id = target_record_id for update;
  if not found then raise exception 'Compliance record not found'; end if;
  if next_status in ('Concern / Review Required','Failed / Unsatisfactory','Waived / Exception Approved')
     and btrim(change_reason) = '' then
    raise exception 'A reason is required for concern, failure or exception decisions';
  end if;
  if next_status = 'Verified'
     and prior.requirement_key in ('dbs_verification','right_to_work_verification','nmc_registration_valid','fitness_suitability')
     and not exists (
       select 1 from public.compliance_verification_details d
       where d.compliance_record_id = prior.id and d.check_performed and d.check_date is not null
     ) then
    raise exception 'Office verification details and a check date are required before this requirement can be verified';
  end if;
  if next_status = 'Verified' and prior.requirement_key = 'dbs_verification'
     and exists (
       select 1 from public.compliance_verification_details d
       where d.compliance_record_id = prior.id
         and d.concern_present
         and d.risk_assessment_status is distinct from 'Suitable'
     ) then
    raise exception 'A DBS disclosure requires a completed suitable risk-assessment outcome before verification';
  end if;
  update public.compliance_records
  set status = next_status,
      applicant_message = coalesce(next_applicant_message, ''),
      evidence_document_id = next_evidence_document_id,
      evidence_received_at = case when next_evidence_document_id is not null then coalesce(evidence_received_at, now()) else evidence_received_at end,
      expiry_date = next_expiry_date,
      verified_by = case when next_status in ('Verified','Waived / Exception Approved') then auth.uid() else null end,
      verified_at = case when next_status in ('Verified','Waived / Exception Approved') then now() else null end
  where id = target_record_id
  returning * into changed;
  insert into public.compliance_events(
    compliance_case_id, compliance_record_id, actor_user_id, action, previous_state, new_state, reason
  ) values (
    changed.compliance_case_id, changed.id, auth.uid(), 'Requirement decision recorded', prior.status, changed.status, coalesce(change_reason, '')
  );
  return changed;
end;
$$;

create or replace function private.enforce_manager_clearance()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.manager_clearance_status = 'Cleared' and (
    old.manager_clearance_status is distinct from new.manager_clearance_status
    or old.deployment_eligible is distinct from new.deployment_eligible
  ) then
    if exists (
      select 1 from public.compliance_records r
      where r.compliance_case_id = new.id
        and r.is_blocking
        and r.requirement_key <> 'manager_clearance'
        and r.status not in ('Verified','Waived / Exception Approved','Not Required')
    ) then
      raise exception 'Manager clearance requires every blocking pre-employment requirement to be satisfied';
    end if;
    new.deployment_eligible = true;
    new.manager_cleared_by = auth.uid();
    new.manager_cleared_at = now();
    new.overall_status = 'Satisfied';
  elsif new.manager_clearance_status <> 'Cleared' then
    new.deployment_eligible = false;
    if new.overall_status = 'Satisfied' then new.overall_status = 'In Progress'; end if;
  end if;
  return new;
end;
$$;

create or replace function private.audit_reference_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_op = 'INSERT' or new.outcome is distinct from old.outcome
     or new.telephone_verified is distinct from old.telephone_verified
     or new.received_at is distinct from old.received_at then
    insert into public.compliance_events(
      compliance_case_id, compliance_record_id, actor_user_id, action, previous_state, new_state
    )
    select new.compliance_case_id, r.id, auth.uid(),
           'Reference ' || new.reference_number || ' verification updated',
           case when tg_op = 'UPDATE' then old.outcome else null end,
           new.outcome
    from public.compliance_records r
    where r.compliance_case_id = new.compliance_case_id
      and r.requirement_key = 'references_completed';
  end if;
  return new;
end;
$$;

create or replace function private.audit_verification_detail_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare target_case_id uuid;
begin
  select compliance_case_id into target_case_id from public.compliance_records where id = new.compliance_record_id;
  insert into public.compliance_events(
    compliance_case_id, compliance_record_id, actor_user_id, action, reason
  ) values (
    target_case_id, new.compliance_record_id, auth.uid(), 'Office verification detail updated',
    case when new.concern_present then 'Concern recorded; confidential detail retained separately' else '' end
  );
  return new;
end;
$$;

create or replace function private.audit_manager_clearance_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.manager_clearance_status is distinct from old.manager_clearance_status then
    insert into public.compliance_events(
      compliance_case_id, actor_user_id, action, previous_state, new_state
    ) values (
      new.id, auth.uid(), 'Registered Manager clearance updated', old.manager_clearance_status, new.manager_clearance_status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists touch_compliance_cases on public.compliance_cases;
create trigger touch_compliance_cases before update on public.compliance_cases
for each row execute function private.touch_sprint_4a_updated_at();
drop trigger if exists enforce_manager_clearance on public.compliance_cases;
create trigger enforce_manager_clearance before update on public.compliance_cases
for each row execute function private.enforce_manager_clearance();
drop trigger if exists audit_manager_clearance_change on public.compliance_cases;
create trigger audit_manager_clearance_change after update on public.compliance_cases
for each row execute function private.audit_manager_clearance_change();
drop trigger if exists touch_compliance_records on public.compliance_records;
create trigger touch_compliance_records before update on public.compliance_records
for each row execute function private.touch_sprint_4a_updated_at();
drop trigger if exists audit_compliance_record_change on public.compliance_records;
create trigger audit_compliance_record_change after insert or update on public.compliance_records
for each row execute function private.audit_compliance_record_change();
drop trigger if exists touch_compliance_verification_details on public.compliance_verification_details;
create trigger touch_compliance_verification_details before update on public.compliance_verification_details
for each row execute function private.touch_sprint_4a_updated_at();
drop trigger if exists touch_reference_verifications on public.reference_verifications;
create trigger touch_reference_verifications before update on public.reference_verifications
for each row execute function private.touch_sprint_4a_updated_at();
drop trigger if exists audit_reference_verification_change on public.reference_verifications;
create trigger audit_reference_verification_change after insert or update on public.reference_verifications
for each row execute function private.audit_reference_verification_change();
drop trigger if exists audit_verification_detail_change on public.compliance_verification_details;
create trigger audit_verification_detail_change after insert or update on public.compliance_verification_details
for each row execute function private.audit_verification_detail_change();

alter table public.compliance_cases enable row level security;
alter table public.compliance_records enable row level security;
alter table public.compliance_verification_details enable row level security;
alter table public.reference_verifications enable row level security;
alter table public.compliance_events enable row level security;

create policy compliance_cases_select on public.compliance_cases for select
using ((select auth.uid()) = user_id or (select public.current_user_is_admin()));
create policy compliance_cases_admin_insert on public.compliance_cases for insert
with check ((select public.current_user_is_admin()));
create policy compliance_cases_admin_update on public.compliance_cases for update
using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));

create policy compliance_records_select on public.compliance_records for select
using (exists (
  select 1 from public.compliance_cases c
  where c.id = compliance_case_id
    and (c.user_id = (select auth.uid()) or (select public.current_user_is_admin()))
));
create policy compliance_records_admin_insert on public.compliance_records for insert
with check ((select public.current_user_is_admin()));
create policy compliance_records_admin_update on public.compliance_records for update
using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));

create policy compliance_verification_details_admin_all on public.compliance_verification_details for all
using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));
create policy reference_verifications_admin_all on public.reference_verifications for all
using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));
create policy compliance_events_admin_select on public.compliance_events for select
using ((select public.current_user_is_admin()));

revoke all privileges on table public.compliance_cases, public.compliance_records,
  public.compliance_verification_details, public.reference_verifications, public.compliance_events
  from anon, authenticated;
grant select on table public.compliance_cases, public.compliance_records to authenticated;
grant insert, update on table public.compliance_cases, public.compliance_records to authenticated;
grant select, insert, update on table public.compliance_verification_details, public.reference_verifications to authenticated;
grant select on table public.compliance_events to authenticated;
grant all privileges on table public.compliance_cases, public.compliance_records,
  public.compliance_verification_details, public.reference_verifications, public.compliance_events
  to service_role;

revoke all on function private.touch_sprint_4a_updated_at() from public, anon, authenticated;
revoke all on function private.audit_compliance_record_change() from public, anon, authenticated;
revoke all on function private.enforce_manager_clearance() from public, anon, authenticated;
revoke all on function private.audit_reference_verification_change() from public, anon, authenticated;
revoke all on function private.audit_verification_detail_change() from public, anon, authenticated;
revoke all on function private.audit_manager_clearance_change() from public, anon, authenticated;
revoke all on function public.admin_update_compliance_record(uuid, text, text, uuid, date, text) from public, anon;
grant execute on function public.admin_update_compliance_record(uuid, text, text, uuid, date, text) to authenticated;

-- Both initial roles share the historical SHC recruitment controls. These are
-- configured through the role engine, not role-name conditionals in the client.
with configured(role_slug, requirement_key, display_name, stage, requirement_type, responsible_party, sort_order, source_kind, metadata) as (
  values
    ('nurse','profile_photo','Recent profile photograph','onboarding','document','applicant',60,'document','{"document_category":"Profile Photo"}'::jsonb),
    ('nurse','shortlisting_record','Shortlisting record retained','deployment','office_verification','administrator',60,'office_verification','{"verification_source":"shortlisting"}'::jsonb),
    ('nurse','interview_record','Interview record retained','deployment','office_verification','administrator',70,'office_verification','{"verification_source":"interview"}'::jsonb),
    ('nurse','fitness_suitability','Fitness and role-suitability declaration','deployment','office_verification','administrator',80,'office_verification','{"verification_source":"fitness"}'::jsonb),
    ('nurse','manager_clearance','Registered Manager pre-employment clearance','deployment','office_verification','administrator',90,'manager_clearance','{"verification_source":"manager_clearance"}'::jsonb),
    ('care-assistant-care-worker','profile_photo','Recent profile photograph','onboarding','document','applicant',60,'document','{"document_category":"Profile Photo"}'::jsonb),
    ('care-assistant-care-worker','shortlisting_record','Shortlisting record retained','deployment','office_verification','administrator',50,'office_verification','{"verification_source":"shortlisting"}'::jsonb),
    ('care-assistant-care-worker','interview_record','Interview record retained','deployment','office_verification','administrator',60,'office_verification','{"verification_source":"interview"}'::jsonb),
    ('care-assistant-care-worker','fitness_suitability','Fitness and role-suitability declaration','deployment','office_verification','administrator',70,'office_verification','{"verification_source":"fitness"}'::jsonb),
    ('care-assistant-care-worker','manager_clearance','Registered Manager pre-employment clearance','deployment','office_verification','administrator',80,'manager_clearance','{"verification_source":"manager_clearance"}'::jsonb)
)
insert into public.role_requirements(
  role_id, requirement_key, display_name, stage, requirement_type,
  responsible_party, is_required, sort_order, metadata, active
)
select r.id, c.requirement_key, c.display_name, c.stage, c.requirement_type,
       c.responsible_party, true, c.sort_order, c.metadata, true
from configured c
join public.roles r on r.slug = c.role_slug
on conflict (role_id, requirement_key) do update
set display_name = excluded.display_name,
    stage = excluded.stage,
    requirement_type = excluded.requirement_type,
    responsible_party = excluded.responsible_party,
    is_required = excluded.is_required,
    sort_order = excluded.sort_order,
    metadata = excluded.metadata,
    active = excluded.active,
    updated_at = now();

comment on table public.compliance_cases is 'Role-bound pre-employment compliance cases with an explicit final manager clearance gate.';
comment on table public.compliance_records is 'Applicant-readable requirement status; confidential verification detail is stored separately.';
comment on table public.compliance_verification_details is 'Admin-only evidence checks, disclosures, professional registration and OH detail.';
comment on table public.reference_verifications is 'Admin-only independent reference verification records sourced from official application referees.';
comment on table public.compliance_events is 'Immutable audit events emitted for compliance requirement state changes.';
