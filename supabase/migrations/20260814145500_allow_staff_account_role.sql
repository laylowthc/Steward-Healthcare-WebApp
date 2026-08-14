-- Align the persisted account-role constraint with the application-wide Staff role.
-- Operational roles remain normalized on applicants/staff_profiles through role_id.
alter table public.users
  add constraint users_role_check_v2
  check (role = any (array[
    'Applicant'::text,
    'Care Assistant'::text,
    'Registered Nurse'::text,
    'Senior Carer'::text,
    'Deputy Manager'::text,
    'Admin'::text,
    'Staff'::text
  ])) not valid;

alter table public.users validate constraint users_role_check_v2;

alter table public.users drop constraint users_role_check;
alter table public.users rename constraint users_role_check_v2 to users_role_check;
