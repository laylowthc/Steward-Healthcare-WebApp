-- SHC StaffHub Sprint 3A: restrict role configuration API privileges.
-- Project-level default privileges include operations that bypass row policies
-- (notably TRUNCATE), so grant authenticated users only RLS-governed DML.

revoke all privileges on table public.roles, public.role_requirements from authenticated;
grant select, insert, update, delete on table public.roles, public.role_requirements to authenticated;
