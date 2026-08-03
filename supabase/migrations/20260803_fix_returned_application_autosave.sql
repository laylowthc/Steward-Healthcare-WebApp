-- Permit an applicant to autosave a record that an administrator has returned.
-- The returned status and reviewer metadata remain protected; only an explicit
-- resubmission moves the record back to Submitted and increments its revision.
create or replace function public.protect_submitted_employment_application()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.current_user_is_admin() and old.status not in ('Draft','Returned for Correction') then
    raise exception 'Submitted applications can only be edited after an administrator returns them for correction';
  end if;

  if not public.current_user_is_admin() then
    new.user_id=old.user_id;
    new.applicant_id=old.applicant_id;

    if old.status='Returned for Correction' and new.status='Submitted' then
      new.revision=old.revision+1;
    else
      new.revision=old.revision;
    end if;

    new.reviewer_notes=old.reviewer_notes;
    new.reviewed_at=old.reviewed_at;
    new.reviewed_by=old.reviewed_by;

    if new.status not in ('Draft','Submitted','Returned for Correction') then
      raise exception 'Applicants cannot set review status';
    end if;
  end if;

  if new.status='Submitted' and old.status is distinct from 'Submitted' then
    new.submitted_at=now();
  end if;

  return new;
end;
$$;
