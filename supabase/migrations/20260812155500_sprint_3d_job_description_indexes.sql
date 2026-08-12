-- Cover Sprint 3D foreign keys used by immutable-version and audit lookups.
create index if not exists job_descriptions_created_by_idx
  on public.job_descriptions(created_by) where created_by is not null;
create index if not exists job_description_ack_jd_idx
  on public.job_description_acknowledgements(job_description_id);
create index if not exists job_description_ack_signer_idx
  on public.job_description_acknowledgements(signer_user_id);
