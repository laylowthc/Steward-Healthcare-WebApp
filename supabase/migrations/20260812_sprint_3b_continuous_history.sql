-- SHC StaffHub Sprint 3B: role-configured continuous chronology requirement.
-- Applicant chronology remains in the existing versioned employment_history
-- JSONB field, so no applicant record or immutable submission is rewritten.

with configured_roles as (
  select id
  from public.roles
  where slug in ('nurse', 'care-assistant-care-worker')
)
update public.role_requirements
set active = false,
    updated_at = now()
where role_id in (select id from configured_roles)
  and requirement_key = 'employment_history';

insert into public.role_requirements (
  role_id,
  requirement_key,
  display_name,
  stage,
  requirement_type,
  responsible_party,
  is_required,
  sort_order,
  metadata,
  active
)
select
  roles.id,
  'continuous_history',
  'Continuous education, employment and activity history',
  'application',
  'information_field',
  'applicant',
  true,
  20,
  '{"completion_source":"continuous_history","precision":"month","requires_secondary_education":true}'::jsonb,
  true
from public.roles
where roles.slug in ('nurse', 'care-assistant-care-worker')
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
