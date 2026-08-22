-- Remove the recursive acknowledgement -> definition -> acknowledgement RLS
-- lookup. The BEFORE INSERT trigger remains the authoritative current-version
-- check and snapshots the active definition before this ownership policy runs.

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
);
