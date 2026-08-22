import assert from 'node:assert/strict';
import { acknowledgementTextFor, currentJobDescriptionComplete, jobDescriptionStatus } from '../src/lib/jobDescriptions';
import { requirementProgress } from '../src/lib/roleEngine';
import { JobDescription, JobDescriptionAcknowledgement } from '../src/types/jobDescription';
import { RoleRequirement } from '../src/types';

const description = (overrides: Partial<JobDescription> = {}): JobDescription => ({
  id: 'care-v1', roleId: 'care-role', title: 'Care Assistant Job Description', version: '1.0',
  content: { organisation: 'Steward Health Care 247 Professionals', documentStatus: 'Controlled HR Document', professionalRequirement: '', summary: 'Care role', reportsTo: 'Manager', duties: ['Provide safe care'], conduct: ['Act safely'], acknowledgementText: 'Care acknowledgement' },
  active: true, createdAt: '2026-08-12T00:00:00Z', updatedAt: '2026-08-12T00:00:00Z', ...overrides,
});
const acknowledgement = (overrides: Partial<JobDescriptionAcknowledgement> = {}): JobDescriptionAcknowledgement => ({
  id: 'ack-care-v1', jobDescriptionId: 'care-v1', userId: 'user', applicantId: 'applicant', roleId: 'care-role',
  roleName: 'Care Assistant / Care Worker', jdTitle: 'Care Assistant Job Description', jdVersion: '1.0',
  contentSnapshot: { organisation: 'Steward Health Care 247 Professionals', documentStatus: 'Controlled HR Document', professionalRequirement: '', summary: 'Care role', reportsTo: 'Manager', duties: ['Provide safe care'], conduct: ['Act safely'], acknowledgementText: 'Care acknowledgement' },
  acknowledgementText: 'Acknowledged', acknowledgementVersion: '1.0', signatureType: 'typed', signatureValue: 'Applicant',
  signerUserId: 'user', signerName: 'Applicant', signedAt: '2026-08-12T00:00:00Z', createdAt: '2026-08-12T00:00:00Z', ...overrides,
});

const careV1 = description();
const careAck = acknowledgement();
assert.equal(jobDescriptionStatus(careV1, []), 'Awaiting Signature', 'Care applicant awaits the configured Care JD');
assert.equal(acknowledgementTextFor(careV1), 'Care acknowledgement', 'the role-specific controlled acknowledgement is presented for signing');
assert.equal(jobDescriptionStatus(careV1, [careAck]), 'Signed', 'Care acknowledgement survives reload when read from persistence');

const nurseV1 = description({ id: 'nurse-v1', roleId: 'nurse-role', title: 'Nurse Job Description' });
const nurseAck = acknowledgement({ id: 'ack-nurse-v1', jobDescriptionId: 'nurse-v1', roleId: 'nurse-role', roleName: 'Nurse', jdTitle: 'Nurse Job Description' });
assert.equal(currentJobDescriptionComplete(nurseV1, [nurseAck]), true, 'Nurse signs the configured Nurse version');
assert.equal(currentJobDescriptionComplete(nurseV1, [careAck]), false, 'a Care signature cannot satisfy Nurse');

const careV2 = description({ id: 'care-v2', version: '2.0' });
assert.equal(jobDescriptionStatus(careV2, [careAck]), 'Re-sign Required', 'a new current version requires a new signature');
assert.equal(careAck.jdVersion, '1.0', 'the prior version snapshot remains unchanged');

assert.equal(jobDescriptionStatus(nurseV1, [careAck]), 'Awaiting Signature', 'a role change preserves Care history but leaves Nurse outstanding');
assert.equal(careAck.roleName, 'Care Assistant / Care Worker');
assert.equal(jobDescriptionStatus(null, []), 'Not Published', 'unpublished authoritative content cannot be signed');

const requirement: RoleRequirement = {
  requirementKey: 'job_description_ack', displayName: 'Job Description', stage: 'onboarding',
  requirementType: 'acknowledgement_signature', responsibleParty: 'applicant', required: true,
  sortOrder: 50, metadata: { completion_source: 'job_description_acknowledgement' }, active: true,
};
assert.equal(requirementProgress(requirement, null, [], [], false), 'Missing');
assert.equal(requirementProgress(requirement, null, [], [], true), 'Complete', 'role requirement derives from persisted current-version acknowledgement');

console.log('Job Description scenarios passed.');
