import { JobDescription, JobDescriptionAcknowledgement, JobDescriptionStatus } from '../types/jobDescription';

export const jobDescriptionAcknowledgementText =
  'I confirm that I have read and understood this Job Description and understand the duties and responsibilities associated with my role.';

export const jobDescriptionStatus = (
  current: JobDescription | null | undefined,
  acknowledgements: JobDescriptionAcknowledgement[],
): JobDescriptionStatus => {
  if (!current) return 'Not Published';
  if (acknowledgements.some(item => item.jobDescriptionId === current.id)) return 'Signed';
  return acknowledgements.some(item => item.roleId === current.roleId)
    ? 'Re-sign Required'
    : 'Awaiting Signature';
};

export const currentJobDescriptionComplete = (
  current: JobDescription | null | undefined,
  acknowledgements: JobDescriptionAcknowledgement[],
) => Boolean(current && acknowledgements.some(item => item.jobDescriptionId === current.id));

