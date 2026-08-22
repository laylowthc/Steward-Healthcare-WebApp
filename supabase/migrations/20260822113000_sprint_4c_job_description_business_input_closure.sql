-- Sprint 4C: authorised Job Description business-input closure.
-- Additive/versioned only: the signed Care Assistant v1.0 definition and every
-- historical acknowledgement remain immutable and addressable.

create or replace function private.protect_job_description()
returns trigger
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if current_user not in ('postgres', 'service_role') and not (select public.current_user_is_admin()) then
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
    or new.effective_date is null
    or btrim(coalesce(new.content ->> 'organisation', '')) = ''
    or btrim(coalesce(new.content ->> 'document_status', '')) = ''
    or btrim(coalesce(new.content ->> 'summary', '')) = ''
    or btrim(coalesce(new.content ->> 'reports_to', '')) = ''
    or jsonb_typeof(new.content -> 'duties') <> 'array'
    or jsonb_array_length(new.content -> 'duties') = 0
    or jsonb_typeof(new.content -> 'conduct') <> 'array'
    or jsonb_array_length(new.content -> 'conduct') = 0
    or btrim(coalesce(new.content ->> 'acknowledgement_text', '')) = ''
  ) then
    raise exception 'A published Job Description requires complete controlled wording and an effective date';
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

revoke all on function private.protect_job_description() from public, anon, authenticated;

create or replace function private.create_job_description_acknowledgement()
returns trigger
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  selected_jd public.job_descriptions%rowtype;
  selected_role_name text;
begin
  select * into selected_jd
  from public.job_descriptions
  where id = new.job_description_id and active;
  if not found then
    raise exception 'The selected Job Description is not the current published version';
  end if;
  if not exists (
    select 1 from public.applicants applicant
    where applicant.id = new.applicant_id
      and applicant.user_id = (select auth.uid())
      and applicant.role_id = selected_jd.role_id
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
  new.acknowledgement_text := selected_jd.content ->> 'acknowledgement_text';
  new.acknowledgement_version := '1.0';
  new.signer_user_id := (select auth.uid());
  new.signed_at := now();
  new.created_at := now();
  return new;
end;
$$;

revoke all on function private.create_job_description_acknowledgement() from public, anon, authenticated;

drop policy if exists job_description_ack_insert on public.job_description_acknowledgements;
create policy job_description_ack_insert on public.job_description_acknowledgements
for insert to authenticated
with check (
  (select auth.uid()) = job_description_acknowledgements.user_id
  and (select auth.uid()) = job_description_acknowledgements.signer_user_id
  and exists (
    select 1
    from public.applicants applicant
    where applicant.id = job_description_acknowledgements.applicant_id
      and applicant.user_id = (select auth.uid())
      and applicant.role_id = job_description_acknowledgements.role_id
  )
  and exists (
    select 1
    from public.job_descriptions description
    where description.id = job_description_acknowledgements.job_description_id
      and description.role_id = job_description_acknowledgements.role_id
      and description.active
  )
);

-- The previously published Care Assistant v1.0 wording is materially different
-- and has a production signature. Publish the approved wording as v2.0.
insert into public.job_descriptions(role_id, title, version, effective_date, content, active)
select id, 'Care Assistant / Care Worker', '2.0', date '2026-08-22',
  jsonb_build_object(
    'organisation', 'Steward Health Care 247 Professionals',
    'document_status', 'Controlled HR Document',
    'professional_requirement', '',
    'summary', E'To provide safe, compassionate and person-centred care and support to service users in accordance with their individual care plans, SHC policies, professional standards and applicable health and social care requirements.\n\nThe Care Assistant / Care Worker supports individuals to maintain their dignity, independence, wellbeing and quality of life while ensuring that concerns relating to their health, safety or welfare are promptly reported.',
    'reports_to', 'Care Coordinator / Registered Manager / Designated Supervisor',
    'duties', jsonb_build_array(
      'Provide personal care and practical support in accordance with individual care plans, preferences and assessed needs.',
      'Support service users with daily living activities while encouraging independence, dignity, privacy and choice.',
      'Assist with mobility, transfers and positioning using approved techniques and equipment where appropriately trained.',
      'Support nutrition, hydration and meal requirements and report relevant concerns.',
      'Provide medication-related support only within the employee''s training, competency, authorisation and SHC procedures.',
      'Observe and report changes in a service user''s physical health, mental wellbeing, behaviour or circumstances.',
      'Maintain accurate, timely and confidential care records and other required documentation.',
      'Follow safeguarding procedures and immediately report suspected abuse, neglect, exploitation or other welfare concerns.',
      'Follow infection prevention and control, health and safety, moving and handling and other applicable SHC procedures.',
      'Communicate professionally with service users, families, colleagues, healthcare professionals and SHC management.',
      'Attend required induction, training, supervision and competency assessments.',
      'Protect confidential and personal information obtained through employment.',
      'Work within the limits of personal competence and seek guidance whenever a task falls outside those limits.',
      'Carry out other reasonable care-related duties consistent with the employee''s role, training and competence.'
    ),
    'conduct', jsonb_build_array(
      'Treat all service users with dignity, respect, compassion and without discrimination.',
      'Maintain appropriate professional boundaries.',
      'Protect confidential information and comply with SHC information-governance requirements.',
      'Act honestly and promptly report incidents, errors, safeguarding concerns and unsafe practice.',
      'Follow SHC policies, procedures and lawful management instructions.'
    ),
    'acknowledgement_text', 'I confirm that I have read and understood this Job Description and understand the duties and responsibilities associated with my role. I agree to perform my duties within my training, competence, SHC policies and applicable professional and regulatory requirements.'
  ), true
from public.roles where slug = 'care-assistant-care-worker'
on conflict (role_id, version) do nothing;

update public.job_descriptions description
set active = true
from public.roles role
where description.role_id = role.id
  and role.slug = 'care-assistant-care-worker'
  and description.version = '2.0'
  and not description.active;

-- Nurse v1.0 is an unsigned, inactive placeholder in production, so it may be
-- completed in place without fabricating an unnecessary version.
update public.job_descriptions description
set title = 'Nurse',
    effective_date = date '2026-08-22',
    content = jsonb_build_object(
      'organisation', 'Steward Health Care 247 Professionals',
      'document_status', 'Controlled HR Document',
      'professional_requirement', 'Appropriate current NMC registration',
      'summary', E'To deliver safe, effective, compassionate and person-centred nursing care within the Nurse''s professional competence and scope of practice.\n\nThe Nurse is responsible for assessing and responding to service-user needs, delivering and evaluating appropriate nursing interventions, maintaining accurate clinical records and working collaboratively with other professionals while practising in accordance with SHC policies and applicable professional standards.',
      'reports_to', 'Registered Manager / Care Coordinator / Designated Clinical Supervisor',
      'duties', jsonb_build_array(
        'Assess service users'' nursing and healthcare needs and contribute to the planning, delivery and evaluation of appropriate care.',
        'Deliver nursing interventions safely and within professional competence and authorised scope of practice.',
        'Monitor service users'' conditions, recognise deterioration or significant changes and escalate concerns appropriately.',
        'Administer and manage medicines where authorised, following applicable medication procedures and professional standards.',
        'Maintain accurate, contemporaneous and confidential clinical and care documentation.',
        'Communicate effectively with service users, relatives, colleagues and relevant health and social care professionals.',
        'Support safe transfers of care and communicate relevant clinical information appropriately.',
        'Identify and report safeguarding concerns and take appropriate action to protect service users from abuse, neglect or avoidable harm.',
        'Apply infection prevention and control procedures and promote safe clinical practice.',
        'Follow appropriate procedures for incidents, medication errors, accidents, clinical concerns and emergencies.',
        'Maintain dignity, privacy, consent, choice and person-centred decision-making throughout care delivery.',
        'Provide appropriate guidance and support to Care Assistants/Care Workers where this falls within the Nurse''s responsibilities.',
        'Maintain required professional registration and promptly notify SHC of any restriction, investigation, suspension or material change affecting fitness to practise or ability to perform the role.',
        'Maintain professional competence through required training, learning and competency assessment.',
        'Participate in supervision, appraisal, quality assurance and service-improvement activities as required.',
        'Work within the limits of competence and seek appropriate clinical or managerial support where required.',
        'Carry out other reasonable nursing duties consistent with professional registration, competence and the employee''s role.'
      ),
      'conduct', jsonb_build_array(
        'Maintain appropriate professional standards and boundaries.',
        'Prioritise service-user safety, dignity and wellbeing.',
        'Preserve confidentiality and handle clinical and personal information appropriately.',
        'Practise only within their competence and authorised scope.',
        'Maintain the professional registration required for the role.',
        'Raise and escalate concerns where safety or quality of care may be compromised.',
        'Follow SHC policies, procedures and lawful management instructions.'
      ),
      'acknowledgement_text', 'I confirm that I have read and understood this Job Description and understand the duties and responsibilities associated with my role. I agree to perform my duties within my professional registration, training and competence, SHC policies and applicable professional and regulatory requirements.'
    ),
    active = true
from public.roles role
where description.role_id = role.id
  and role.slug = 'nurse'
  and description.version = '1.0'
  and not exists (
    select 1 from public.job_description_acknowledgements acknowledgement
    where acknowledgement.job_description_id = description.id
  );

-- Defensive fresh-environment seed. If an unexpected acknowledgement exists
-- against Nurse v1.0, preserve it and publish the approved wording as v2.0.
insert into public.job_descriptions(role_id, title, version, effective_date, content, active)
select id, 'Nurse',
  case when exists (
    select 1
    from public.job_descriptions existing
    join public.job_description_acknowledgements acknowledgement
      on acknowledgement.job_description_id = existing.id
    where existing.role_id = role.id and existing.version = '1.0'
  ) then '2.0' else '1.0' end,
  date '2026-08-22',
  jsonb_build_object(
    'organisation', 'Steward Health Care 247 Professionals',
    'document_status', 'Controlled HR Document',
    'professional_requirement', 'Appropriate current NMC registration',
    'summary', E'To deliver safe, effective, compassionate and person-centred nursing care within the Nurse''s professional competence and scope of practice.\n\nThe Nurse is responsible for assessing and responding to service-user needs, delivering and evaluating appropriate nursing interventions, maintaining accurate clinical records and working collaboratively with other professionals while practising in accordance with SHC policies and applicable professional standards.',
    'reports_to', 'Registered Manager / Care Coordinator / Designated Clinical Supervisor',
    'duties', jsonb_build_array(
      'Assess service users'' nursing and healthcare needs and contribute to the planning, delivery and evaluation of appropriate care.',
      'Deliver nursing interventions safely and within professional competence and authorised scope of practice.',
      'Monitor service users'' conditions, recognise deterioration or significant changes and escalate concerns appropriately.',
      'Administer and manage medicines where authorised, following applicable medication procedures and professional standards.',
      'Maintain accurate, contemporaneous and confidential clinical and care documentation.',
      'Communicate effectively with service users, relatives, colleagues and relevant health and social care professionals.',
      'Support safe transfers of care and communicate relevant clinical information appropriately.',
      'Identify and report safeguarding concerns and take appropriate action to protect service users from abuse, neglect or avoidable harm.',
      'Apply infection prevention and control procedures and promote safe clinical practice.',
      'Follow appropriate procedures for incidents, medication errors, accidents, clinical concerns and emergencies.',
      'Maintain dignity, privacy, consent, choice and person-centred decision-making throughout care delivery.',
      'Provide appropriate guidance and support to Care Assistants/Care Workers where this falls within the Nurse''s responsibilities.',
      'Maintain required professional registration and promptly notify SHC of any restriction, investigation, suspension or material change affecting fitness to practise or ability to perform the role.',
      'Maintain professional competence through required training, learning and competency assessment.',
      'Participate in supervision, appraisal, quality assurance and service-improvement activities as required.',
      'Work within the limits of competence and seek appropriate clinical or managerial support where required.',
      'Carry out other reasonable nursing duties consistent with professional registration, competence and the employee''s role.'
    ),
    'conduct', jsonb_build_array(
      'Maintain appropriate professional standards and boundaries.',
      'Prioritise service-user safety, dignity and wellbeing.',
      'Preserve confidentiality and handle clinical and personal information appropriately.',
      'Practise only within their competence and authorised scope.',
      'Maintain the professional registration required for the role.',
      'Raise and escalate concerns where safety or quality of care may be compromised.',
      'Follow SHC policies, procedures and lawful management instructions.'
    ),
    'acknowledgement_text', 'I confirm that I have read and understood this Job Description and understand the duties and responsibilities associated with my role. I agree to perform my duties within my professional registration, training and competence, SHC policies and applicable professional and regulatory requirements.'
  ), true
from public.roles role
where role.slug = 'nurse'
  and (
    not exists (
      select 1 from public.job_descriptions description
      where description.role_id = role.id and description.version = '1.0'
    )
    or exists (
      select 1
      from public.job_descriptions existing
      join public.job_description_acknowledgements acknowledgement
        on acknowledgement.job_description_id = existing.id
      where existing.role_id = role.id and existing.version = '1.0'
    )
  )
on conflict (role_id, version) do nothing;

comment on function private.create_job_description_acknowledgement() is
  'Creates an immutable acknowledgement only for the authenticated user own applicant record and current persisted role; dual-role administrators cannot sign for another applicant.';
