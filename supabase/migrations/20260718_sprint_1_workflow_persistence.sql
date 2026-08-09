-- Sprint 1 stabilization: persist business workflow records in Supabase.
-- Existing structures are preserved. This migration only extends public.users
-- and adds missing workflow tables used by the current MVP.

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists permissions text[] default '{}',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.users
  alter column status set default 'Pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_status_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_status_check check (status in ('Pending', 'Active', 'Suspended'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_role_check check (role in ('Admin', 'Staff', 'Applicant', 'Family'));
  end if;
end $$;

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text default '',
  position text default 'Care Assistant',
  status text not null default 'Applied' check (status in ('Applied', 'Screening', 'Interview', 'Compliance', 'Accepted', 'Rejected')),
  notes text,
  compliance_checked jsonb default '{}'::jsonb,
  interview_time timestamptz,
  interview_meet_url text,
  cv_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists applicants_user_id_idx on public.applicants(user_id);
create index if not exists applicants_email_idx on public.applicants(lower(email));

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  applicant_id uuid references public.applicants(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text default '',
  address text default '',
  role text default 'Care Assistant',
  employment_status text not null default 'Active' check (employment_status in ('Active', 'Non-Compliant', 'Suspended')),
  nmc_pin text,
  nmc_expiry date,
  dbs_status text default 'Pending',
  dbs_number text,
  dbs_expiry date,
  right_to_work text default 'Pending',
  right_to_work_expiry date,
  training_status text default 'Pending',
  training_expiry date,
  joined_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Production already has a narrower staff_profiles table. CREATE TABLE IF NOT
-- EXISTS does not add missing columns, so extend the existing table explicitly.
alter table public.staff_profiles
  add column if not exists applicant_id uuid references public.applicants(id) on delete set null,
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists phone text default '',
  add column if not exists address text default '',
  add column if not exists role text default 'Care Assistant',
  add column if not exists employment_status text default 'Active',
  add column if not exists nmc_pin text,
  add column if not exists nmc_expiry date,
  add column if not exists dbs_status text default 'Pending',
  add column if not exists dbs_expiry date,
  add column if not exists right_to_work_expiry date,
  add column if not exists training_status text default 'Pending',
  add column if not exists training_expiry date,
  add column if not exists joined_date date default current_date;

create unique index if not exists staff_profiles_user_id_key
  on public.staff_profiles(user_id)
  where user_id is not null;
create index if not exists staff_profiles_email_idx on public.staff_profiles(lower(email));

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  staff_profile_id uuid references public.staff_profiles(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  staff_name text not null,
  role text default 'Care Assistant',
  week_ending date not null,
  client text,
  upload_date date default current_date,
  approval_status text not null default 'Pending' check (approval_status in ('Pending', 'Approved', 'Rejected', 'Paid')),
  hours_worked numeric default 0,
  file_url text,
  reviewer text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists timesheets_user_id_idx on public.timesheets(user_id);
create index if not exists timesheets_staff_profile_id_idx on public.timesheets(staff_profile_id);

create table if not exists public.role_templates (
  id uuid primary key default gen_random_uuid(),
  role text unique not null,
  salary_range text default '',
  description text default '',
  responsibilities text[] default '{}',
  required_credentials text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  actor_name text default 'System',
  type text default 'status',
  created_at timestamptz default now()
);

create table if not exists public.family_feedback (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  family_representative text default '',
  relation text default '',
  caregiver_assigned text default '',
  rating_care_quality integer default 0,
  rating_communication integer default 0,
  rating_punctuality integer default 0,
  feedback_comments text default '',
  anonymous boolean default false,
  date_submitted timestamptz default now(),
  status text default 'Awaiting Action',
  category text default 'General Inquiry',
  has_contact_request boolean default false,
  contact_email_or_phone text
);

alter table public.documents add column if not exists applicant_id uuid references public.applicants(id) on delete set null;
alter table public.documents add column if not exists staff_profile_id uuid references public.staff_profiles(id) on delete set null;

alter table public.applicants enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.timesheets enable row level security;
alter table public.role_templates enable row level security;
alter table public.activity_logs enable row level security;
alter table public.family_feedback enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(u.role) = 'admin'
      and u.status = 'Active'
  );
$$;

create or replace function public.protect_applicant_workflow_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    if new.status is distinct from old.status
       or new.user_id is distinct from old.user_id then
      raise exception
        'Applicants cannot change recruitment status or account ownership';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_applicant_workflow_fields
  on public.applicants;

create trigger protect_applicant_workflow_fields
before update on public.applicants
for each row
execute function public.protect_applicant_workflow_fields();

drop policy if exists applicants_read on public.applicants;
create policy applicants_read on public.applicants
for select using (public.current_user_is_admin() or user_id = auth.uid());

drop policy if exists applicants_write on public.applicants;
drop policy if exists applicants_insert on public.applicants;
create policy applicants_insert on public.applicants
for insert with check (
  public.current_user_is_admin()
  or (user_id = auth.uid() and status = 'Applied')
);

drop policy if exists applicants_update on public.applicants;
create policy applicants_update on public.applicants
for update using (public.current_user_is_admin() or user_id = auth.uid())
with check (public.current_user_is_admin() or user_id = auth.uid());

drop policy if exists applicants_delete on public.applicants;
create policy applicants_delete on public.applicants
for delete using (public.current_user_is_admin());

drop policy if exists staff_profiles_read on public.staff_profiles;
create policy staff_profiles_read on public.staff_profiles
for select using (public.current_user_is_admin() or user_id = auth.uid());

drop policy if exists staff_profiles_write on public.staff_profiles;
create policy staff_profiles_write on public.staff_profiles
for all using (public.current_user_is_admin() or user_id = auth.uid())
with check (public.current_user_is_admin() or user_id = auth.uid());

drop policy if exists timesheets_read on public.timesheets;
create policy timesheets_read on public.timesheets
for select using (public.current_user_is_admin() or user_id = auth.uid());

drop policy if exists timesheets_write on public.timesheets;
create policy timesheets_write on public.timesheets
for all using (public.current_user_is_admin() or user_id = auth.uid())
with check (public.current_user_is_admin() or user_id = auth.uid());

drop policy if exists role_templates_read on public.role_templates;
create policy role_templates_read on public.role_templates
for select using (true);

drop policy if exists role_templates_write on public.role_templates;
create policy role_templates_write on public.role_templates
for all using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists activity_logs_read on public.activity_logs;
create policy activity_logs_read on public.activity_logs
for select using (public.current_user_is_admin() or actor_user_id = auth.uid());

drop policy if exists activity_logs_write on public.activity_logs;
create policy activity_logs_write on public.activity_logs
for insert with check (public.current_user_is_admin() or actor_user_id = auth.uid());

drop policy if exists family_feedback_read on public.family_feedback;
create policy family_feedback_read on public.family_feedback
for select using (public.current_user_is_admin());

drop policy if exists family_feedback_insert on public.family_feedback;
create policy family_feedback_insert on public.family_feedback
for insert with check (true);
