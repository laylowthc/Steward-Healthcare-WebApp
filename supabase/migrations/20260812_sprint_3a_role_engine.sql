-- SHC StaffHub Sprint 3A: persistent role engine and role-driven requirements.
-- Additive only: legacy role text and role_templates data are preserved.

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_name_not_blank check (btrim(name) <> ''),
  constraint roles_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint roles_name_key unique (name),
  constraint roles_slug_key unique (slug)
);

create table if not exists public.role_requirements (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  requirement_key text not null,
  display_name text not null,
  stage text not null,
  requirement_type text not null,
  responsible_party text not null,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_requirements_key_not_blank check (btrim(requirement_key) <> ''),
  constraint role_requirements_name_not_blank check (btrim(display_name) <> ''),
  constraint role_requirements_stage_check check (stage in ('application', 'onboarding', 'deployment')),
  constraint role_requirements_type_check check (requirement_type in (
    'information_field', 'document', 'hr_form', 'acknowledgement_signature',
    'office_verification', 'professional_registration'
  )),
  constraint role_requirements_party_check check (responsible_party in ('applicant', 'administrator')),
  constraint role_requirements_role_key unique (role_id, requirement_key)
);

create index if not exists roles_active_sort_idx on public.roles(active, name);
create index if not exists role_requirements_role_stage_sort_idx
  on public.role_requirements(role_id, stage, sort_order, display_name);
create index if not exists role_requirements_active_idx on public.role_requirements(active);

-- Preserve any legacy custom templates as roles before seeding the two managed roles.
do $$
begin
  if to_regclass('public.role_templates') is not null then
    execute $legacy$
      insert into public.roles(name, slug, description, active)
      select role,
             trim(both '-' from regexp_replace(lower(role), '[^a-z0-9]+', '-', 'g')),
             coalesce(description, ''),
             true
      from public.role_templates
      where btrim(coalesce(role, '')) <> ''
        and lower(btrim(role)) not in (
          'nurse', 'registered nurse', 'rn',
          'care assistant', 'care worker', 'care assistant / care worker', 'healthcare assistant', 'hca'
        )
      on conflict (slug) do update
        set name = excluded.name,
            description = case when public.roles.description = '' then excluded.description else public.roles.description end,
            updated_at = now()
    $legacy$;
  end if;
end;
$$;

insert into public.roles(name, slug, description, active)
values
  ('Nurse', 'nurse', 'Registered nursing role providing safe, person-centred clinical care.', true),
  ('Care Assistant / Care Worker', 'care-assistant-care-worker', 'Care and support role assisting people with safe, dignified daily living.', true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    active = true,
    updated_at = now();

with configured(role_slug, requirement_key, display_name, stage, requirement_type, responsible_party, is_required, sort_order, metadata) as (
  values
    ('nurse','official_application','Official SHC Application for Employment','application','hr_form','applicant',true,10,'{"completion_source":"official_application"}'::jsonb),
    ('nurse','employment_history','Full education and employment history','application','information_field','applicant',true,20,'{"completion_source":"employment_history"}'::jsonb),
    ('nurse','nmc_registration_information','NMC registration information','application','professional_registration','applicant',true,30,'{"form_fields":["nmcPin","rna"]}'::jsonb),
    ('nurse','nmc_pin','NMC PIN','application','professional_registration','applicant',true,40,'{"form_field":"nmcPin"}'::jsonb),
    ('nurse','nmc_expiry','NMC expiry / renewal information','application','professional_registration','applicant',true,50,'{"form_field":"nmcExpiryDate"}'::jsonb),
    ('nurse','professional_references','Two professional references','application','information_field','applicant',true,60,'{"completion_source":"professional_references","minimum":2}'::jsonb),
    ('nurse','declaration_signature','Applicant declarations and signature','application','acknowledgement_signature','applicant',true,70,'{"completion_source":"declaration_signature"}'::jsonb),
    ('nurse','starter_paye_forms','Mandatory starter / PAYE forms','onboarding','hr_form','applicant',true,10,'{"document_categories":["New Starter Form","Bank Details & PAYE"]}'::jsonb),
    ('nurse','bank_details','Bank details','onboarding','information_field','applicant',true,20,'{"document_category":"Bank Details & PAYE"}'::jsonb),
    ('nurse','next_of_kin','Next of kin / emergency contact','onboarding','information_field','applicant',true,30,'{"document_category":"Next of Kin"}'::jsonb),
    ('nurse','employment_declarations','Relevant employment declarations','onboarding','acknowledgement_signature','applicant',true,40,'{"document_categories":["48-Hour Opt-Out","Policies Acknowledgement"]}'::jsonb),
    ('nurse','job_description_ack','Nurse Job Description acknowledgement and signature','onboarding','acknowledgement_signature','applicant',true,50,'{"document_category":"Job Description"}'::jsonb),
    ('nurse','nmc_registration_valid','Valid NMC registration','deployment','office_verification','administrator',true,10,'{"verification_source":"nmc"}'::jsonb),
    ('nurse','dbs_verification','DBS verification','deployment','office_verification','administrator',true,20,'{"verification_source":"dbs"}'::jsonb),
    ('nurse','right_to_work_verification','Right to Work verification','deployment','office_verification','administrator',true,30,'{"verification_source":"right_to_work"}'::jsonb),
    ('nurse','references_completed','Required references completed','deployment','office_verification','administrator',true,40,'{"verification_source":"references"}'::jsonb),
    ('nurse','mandatory_training','Mandatory training / compliance as configured by SHC','deployment','office_verification','administrator',true,50,'{"verification_source":"training"}'::jsonb),

    ('care-assistant-care-worker','official_application','Official SHC Application for Employment','application','hr_form','applicant',true,10,'{"completion_source":"official_application"}'::jsonb),
    ('care-assistant-care-worker','employment_history','Full education and employment history','application','information_field','applicant',true,20,'{"completion_source":"employment_history"}'::jsonb),
    ('care-assistant-care-worker','professional_references','Two professional references','application','information_field','applicant',true,30,'{"completion_source":"professional_references","minimum":2}'::jsonb),
    ('care-assistant-care-worker','declaration_signature','Applicant declarations and signature','application','acknowledgement_signature','applicant',true,40,'{"completion_source":"declaration_signature"}'::jsonb),
    ('care-assistant-care-worker','starter_paye_forms','Mandatory starter / PAYE forms','onboarding','hr_form','applicant',true,10,'{"document_categories":["New Starter Form","Bank Details & PAYE"]}'::jsonb),
    ('care-assistant-care-worker','bank_details','Bank details','onboarding','information_field','applicant',true,20,'{"document_category":"Bank Details & PAYE"}'::jsonb),
    ('care-assistant-care-worker','next_of_kin','Next of kin / emergency contact','onboarding','information_field','applicant',true,30,'{"document_category":"Next of Kin"}'::jsonb),
    ('care-assistant-care-worker','employment_declarations','Relevant employment declarations','onboarding','acknowledgement_signature','applicant',true,40,'{"document_categories":["48-Hour Opt-Out","Policies Acknowledgement"]}'::jsonb),
    ('care-assistant-care-worker','job_description_ack','Care Assistant Job Description acknowledgement and signature','onboarding','acknowledgement_signature','applicant',true,50,'{"document_category":"Job Description"}'::jsonb),
    ('care-assistant-care-worker','dbs_verification','DBS verification','deployment','office_verification','administrator',true,10,'{"verification_source":"dbs"}'::jsonb),
    ('care-assistant-care-worker','right_to_work_verification','Right to Work verification','deployment','office_verification','administrator',true,20,'{"verification_source":"right_to_work"}'::jsonb),
    ('care-assistant-care-worker','references_completed','Required references completed','deployment','office_verification','administrator',true,30,'{"verification_source":"references"}'::jsonb),
    ('care-assistant-care-worker','mandatory_training','Mandatory training / compliance as configured by SHC','deployment','office_verification','administrator',true,40,'{"verification_source":"training"}'::jsonb)
)
insert into public.role_requirements(
  role_id, requirement_key, display_name, stage, requirement_type,
  responsible_party, is_required, sort_order, metadata, active
)
select r.id, c.requirement_key, c.display_name, c.stage, c.requirement_type,
       c.responsible_party, c.is_required, c.sort_order, c.metadata, true
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
    active = true,
    updated_at = now();

alter table public.applicants add column if not exists role_id uuid references public.roles(id) on delete set null;
alter table public.employment_applications add column if not exists role_id uuid references public.roles(id) on delete set null;
alter table public.staff_profiles add column if not exists role_id uuid references public.roles(id) on delete set null;

alter table public.applicants alter column position drop default;

update public.applicants a
set role_id = r.id
from public.roles r
where a.role_id is null
  and (
    lower(btrim(coalesce(a.position, ''))) = lower(r.name)
    or trim(both '-' from regexp_replace(lower(coalesce(a.position, '')), '[^a-z0-9]+', '-', 'g')) = r.slug
    or (r.slug = 'nurse' and lower(btrim(coalesce(a.position, ''))) in ('registered nurse', 'rn'))
    or (r.slug = 'care-assistant-care-worker' and lower(btrim(coalesce(a.position, ''))) in ('care assistant', 'care worker', 'healthcare assistant', 'hca'))
  );

-- Sprint 2 deliberately freezes submitted application rows. Temporarily suspend
-- only that guard for this controlled foreign-key backfill; the migration is
-- transactional, so the trigger is restored automatically on any failure.
do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.employment_applications'::regclass
      and tgname = 'protect_submitted_employment_application'
      and not tgisinternal
  ) then
    alter table public.employment_applications disable trigger protect_submitted_employment_application;
  end if;
end;
$$;

update public.employment_applications a
set role_id = r.id
from public.roles r
where a.role_id is null
  and (
    lower(btrim(coalesce(a.position_applied, ''))) = lower(r.name)
    or trim(both '-' from regexp_replace(lower(coalesce(a.position_applied, '')), '[^a-z0-9]+', '-', 'g')) = r.slug
    or (r.slug = 'nurse' and lower(btrim(coalesce(a.position_applied, ''))) in ('registered nurse', 'rn'))
    or (r.slug = 'care-assistant-care-worker' and lower(btrim(coalesce(a.position_applied, ''))) in ('care assistant', 'care worker', 'healthcare assistant', 'hca'))
  );

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.employment_applications'::regclass
      and tgname = 'protect_submitted_employment_application'
      and not tgisinternal
  ) then
    alter table public.employment_applications enable trigger protect_submitted_employment_application;
  end if;
end;
$$;

update public.staff_profiles s
set role_id = r.id
from public.roles r
where s.role_id is null
  and (
    lower(btrim(coalesce(s.role, ''))) = lower(r.name)
    or trim(both '-' from regexp_replace(lower(coalesce(s.role, '')), '[^a-z0-9]+', '-', 'g')) = r.slug
    or (r.slug = 'nurse' and lower(btrim(coalesce(s.role, ''))) in ('registered nurse', 'rn'))
    or (r.slug = 'care-assistant-care-worker' and lower(btrim(coalesce(s.role, ''))) in ('care assistant', 'care worker', 'healthcare assistant', 'hca'))
  );

create index if not exists applicants_role_id_idx on public.applicants(role_id);
create index if not exists employment_applications_role_id_idx on public.employment_applications(role_id);
create index if not exists staff_profiles_role_id_idx on public.staff_profiles(role_id);

create or replace function public.validate_selected_operational_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role_id is not null
     and (tg_op = 'INSERT' or new.role_id is distinct from old.role_id)
     and not exists (select 1 from public.roles r where r.id = new.role_id and r.active) then
    raise exception 'The selected operational role is not active';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_applicant_operational_role on public.applicants;
create trigger validate_applicant_operational_role
before insert or update of role_id on public.applicants
for each row execute function public.validate_selected_operational_role();

drop trigger if exists validate_application_operational_role on public.employment_applications;
create trigger validate_application_operational_role
before insert or update of role_id on public.employment_applications
for each row execute function public.validate_selected_operational_role();

create or replace function public.set_role_engine_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_roles_updated_at on public.roles;
create trigger set_roles_updated_at before update on public.roles
for each row execute function public.set_role_engine_updated_at();

drop trigger if exists set_role_requirements_updated_at on public.role_requirements;
create trigger set_role_requirements_updated_at before update on public.role_requirements
for each row execute function public.set_role_engine_updated_at();

alter table public.roles enable row level security;
alter table public.role_requirements enable row level security;

drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
for select to authenticated
using (
  active
  or public.current_user_is_admin()
  or exists (
    select 1 from public.applicants a
    where a.role_id = roles.id and a.user_id = (select auth.uid())
  )
);

drop policy if exists roles_admin_insert on public.roles;
create policy roles_admin_insert on public.roles
for insert to authenticated
with check (public.current_user_is_admin());

drop policy if exists roles_admin_update on public.roles;
create policy roles_admin_update on public.roles
for update to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists roles_admin_delete on public.roles;
create policy roles_admin_delete on public.roles
for delete to authenticated
using (public.current_user_is_admin());

drop policy if exists role_requirements_select on public.role_requirements;
create policy role_requirements_select on public.role_requirements
for select to authenticated
using (
  public.current_user_is_admin()
  or exists (
    select 1
    from public.roles r
    where r.id = role_requirements.role_id
      and (
        r.active
        or exists (
          select 1 from public.applicants a
          where a.role_id = r.id and a.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists role_requirements_admin_insert on public.role_requirements;
create policy role_requirements_admin_insert on public.role_requirements
for insert to authenticated
with check (public.current_user_is_admin());

drop policy if exists role_requirements_admin_update on public.role_requirements;
create policy role_requirements_admin_update on public.role_requirements
for update to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists role_requirements_admin_delete on public.role_requirements;
create policy role_requirements_admin_delete on public.role_requirements
for delete to authenticated
using (public.current_user_is_admin());

-- Explicit Data API grants are intentional. RLS remains the authorization boundary.
grant select on table public.roles, public.role_requirements to authenticated;
grant insert, update, delete on table public.roles, public.role_requirements to authenticated;
grant select, insert, update, delete on table public.roles, public.role_requirements to service_role;

comment on table public.roles is 'Authoritative SHC operational role configuration.';
comment on table public.role_requirements is 'Stage-, owner-, and type-aware requirements for each SHC role.';
