-- Sprint 4C: lean role-driven training and credential register.
-- Additive only. Existing staff summary fields, compliance records and documents are preserved.

create table if not exists public.staff_training_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  staff_profile_id uuid not null references public.staff_profiles(id) on delete restrict,
  role_requirement_id uuid not null references public.role_requirements(id) on delete restrict,
  provider text not null default '',
  issue_date date,
  expiry_date date,
  evidence_document_id uuid references public.documents(id) on delete restrict,
  verification_status text not null default 'Awaiting Verification'
    check (verification_status in ('Awaiting Verification', 'Verified')),
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_profile_id, role_requirement_id),
  constraint staff_training_dates_valid check (
    expiry_date is null or issue_date is null or expiry_date >= issue_date
  ),
  constraint staff_training_verification_consistent check (
    (verification_status = 'Awaiting Verification' and verified_by is null and verified_at is null)
    or
    (verification_status = 'Verified' and verified_by is not null and verified_at is not null)
  )
);

create index if not exists staff_training_records_user_idx
  on public.staff_training_records(user_id);
create index if not exists staff_training_records_requirement_idx
  on public.staff_training_records(role_requirement_id);
create index if not exists staff_training_records_expiry_idx
  on public.staff_training_records(expiry_date)
  where expiry_date is not null;
create index if not exists staff_training_records_document_idx
  on public.staff_training_records(evidence_document_id)
  where evidence_document_id is not null;

create or replace function private.protect_staff_training_verification()
returns trigger
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if not (select public.current_user_is_admin()) then
    if tg_op = 'INSERT' then
      if new.user_id is distinct from (select auth.uid())
         or new.verification_status <> 'Awaiting Verification'
         or new.verified_by is not null
         or new.verified_at is not null then
        raise exception 'Staff may submit only their own unverified training evidence';
      end if;
    elsif new.user_id is distinct from old.user_id
       or new.staff_profile_id is distinct from old.staff_profile_id
       or new.role_requirement_id is distinct from old.role_requirement_id
       or new.verification_status is distinct from old.verification_status
       or new.verified_by is distinct from old.verified_by
       or new.verified_at is distinct from old.verified_at then
      raise exception 'Staff cannot alter training ownership or verification';
    end if;
    if tg_op = 'UPDATE' and (
      new.provider is distinct from old.provider
      or new.issue_date is distinct from old.issue_date
      or new.expiry_date is distinct from old.expiry_date
      or new.evidence_document_id is distinct from old.evidence_document_id
    ) then
      new.verification_status = 'Awaiting Verification';
      new.verified_by = null;
      new.verified_at = null;
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_staff_training_verification on public.staff_training_records;
create trigger protect_staff_training_verification
before insert or update on public.staff_training_records
for each row execute function private.protect_staff_training_verification();

revoke all on function private.protect_staff_training_verification() from public, anon, authenticated;

create or replace function public.admin_verify_training_record(
  target_record_id uuid,
  next_verified boolean
)
returns public.staff_training_records
language plpgsql
security invoker
set search_path = public
as $$
declare
  changed public.staff_training_records%rowtype;
begin
  if not (select public.current_user_is_admin()) then
    raise exception 'Only an active administrator may verify training evidence';
  end if;

  update public.staff_training_records
  set verification_status = case when next_verified then 'Verified' else 'Awaiting Verification' end,
      verified_by = case when next_verified then (select auth.uid()) else null end,
      verified_at = case when next_verified then now() else null end,
      updated_at = now()
  where id = target_record_id
  returning * into changed;

  if not found then raise exception 'Training record not found'; end if;
  return changed;
end;
$$;

revoke all on function public.admin_verify_training_record(uuid, boolean) from public, anon;
grant execute on function public.admin_verify_training_record(uuid, boolean) to authenticated;

alter table public.staff_training_records enable row level security;

drop policy if exists staff_training_records_select on public.staff_training_records;
create policy staff_training_records_select on public.staff_training_records
for select to authenticated
using (
  (select auth.uid()) = user_id
  or (select public.current_user_is_admin())
);

drop policy if exists staff_training_records_insert on public.staff_training_records;
create policy staff_training_records_insert on public.staff_training_records
for insert to authenticated
with check (
  (select public.current_user_is_admin())
  or (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.staff_profiles s
      join public.role_requirements rr on rr.id = role_requirement_id
      where s.id = staff_profile_id
        and s.user_id = (select auth.uid())
        and s.role_id = rr.role_id
        and rr.active
        and coalesce((rr.metadata ->> 'training_credential')::boolean, false)
    )
    and (
      evidence_document_id is null
      or exists (
        select 1 from public.documents d
        where d.id = evidence_document_id and d.user_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists staff_training_records_update on public.staff_training_records;
create policy staff_training_records_update on public.staff_training_records
for update to authenticated
using (
  (select public.current_user_is_admin()) or (select auth.uid()) = user_id
)
with check (
  (select public.current_user_is_admin())
  or (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.staff_profiles s
      join public.role_requirements rr on rr.id = role_requirement_id
      where s.id = staff_profile_id
        and s.user_id = (select auth.uid())
        and s.role_id = rr.role_id
        and rr.active
        and coalesce((rr.metadata ->> 'training_credential')::boolean, false)
    )
    and (
      evidence_document_id is null
      or exists (
        select 1 from public.documents d
        where d.id = evidence_document_id and d.user_id = (select auth.uid())
      )
    )
  )
);

revoke all privileges on table public.staff_training_records from anon;
grant select, insert, update on table public.staff_training_records to authenticated;

-- Seed candidate controls from SHC's historical Personnel Checklist and role/profile material.
-- Only Induction Training and Care Certificate are marked required because the Personnel Checklist
-- names them explicitly. They are not deployment-blocking. Other historical topics remain optional
-- and visibly require SHC policy confirmation before becoming mandatory or deployment-blocking.
with configured(requirement_key, display_name, is_required, sort_order, metadata) as (
  values
    ('training_induction', 'Induction Training', true, 210,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":false,"deployment_blocking":false,"source":"SHC Personnel Checklist"}'::jsonb),
    ('training_care_certificate', 'Care Certificate', true, 220,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":false,"deployment_blocking":false,"source":"SHC Personnel Checklist"}'::jsonb),
    ('credential_professional_qualification', 'Relevant Professional Qualification', false, 230,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":false,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC Personnel Checklist / role profiles"}'::jsonb),
    ('training_moving_handling', 'Moving & Handling', false, 240,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":true,"expiry_warning_days":45,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC role material"}'::jsonb),
    ('training_safeguarding_adults', 'Safeguarding Adults', false, 250,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":true,"expiry_warning_days":45,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC role material"}'::jsonb),
    ('training_medication', 'Medication Administration / Management', false, 260,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":true,"expiry_warning_days":45,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC role material"}'::jsonb),
    ('training_infection_control', 'Infection Prevention & Control', false, 270,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":true,"expiry_warning_days":45,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC role material"}'::jsonb),
    ('training_basic_life_support', 'Basic Life Support', false, 280,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":true,"expiry_warning_days":45,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC training roadmap"}'::jsonb),
    ('training_fire_safety', 'Fire Safety', false, 290,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":true,"expiry_warning_days":45,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC Healthcare Assistant Job Description"}'::jsonb),
    ('training_health_safety', 'Health & Safety', false, 300,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":true,"expiry_warning_days":45,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC Healthcare Assistant Job Description"}'::jsonb),
    ('training_dementia_awareness', 'Dementia Awareness', false, 310,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":true,"expiry_warning_days":45,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC service profile"}'::jsonb),
    ('training_mental_capacity_act', 'Mental Capacity Act', false, 320,
      '{"training_credential":true,"evidence_required":true,"expiry_applicable":true,"expiry_warning_days":45,"deployment_blocking":false,"policy_status":"SHC CONFIRMATION REQUIRED","source":"SHC training roadmap"}'::jsonb)
)
insert into public.role_requirements(
  role_id, requirement_key, display_name, stage, requirement_type,
  responsible_party, is_required, sort_order, metadata, active
)
select r.id, c.requirement_key, c.display_name, 'deployment', 'document',
       'applicant', c.is_required, c.sort_order, c.metadata, true
from configured c
cross join public.roles r
where r.slug in ('nurse', 'care-assistant-care-worker')
on conflict (role_id, requirement_key) do update
set display_name = excluded.display_name,
    stage = excluded.stage,
    requirement_type = excluded.requirement_type,
    responsible_party = excluded.responsible_party,
    is_required = excluded.is_required,
    sort_order = excluded.sort_order,
    metadata = excluded.metadata,
    active = true,
    updated_at = now();

-- NMC remains owned by Sprint 4A. Metadata only makes that existing requirement discoverable
-- in the Training & Credentials view; it does not create another NMC record.
update public.role_requirements
set metadata = metadata || jsonb_build_object(
      'training_credential', true,
      'credential_source', 'existing_compliance',
      'evidence_required', false,
      'expiry_applicable', true,
      'expiry_warning_days', 45,
      'deployment_blocking', true
    ),
    updated_at = now()
where requirement_key = 'nmc_registration_valid'
  and role_id = (select id from public.roles where slug = 'nurse');
