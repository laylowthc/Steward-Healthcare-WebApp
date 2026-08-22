import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RoleRequirement, RoleTemplate } from '../src/types';
import {
  deriveTrainingCredentials,
  roleTrainingRequirements,
  statusFromVerifiedDates,
  trainingDeploymentSatisfied,
} from '../src/lib/trainingCredentials';
import { StaffTrainingRecord } from '../src/types/trainingCredentials';
import { ComplianceRecord } from '../src/types/preEmploymentCompliance';

const requirement = (key: string, overrides: Partial<RoleRequirement> = {}): RoleRequirement => ({
  id: `req-${key}`,
  roleId: 'role-care',
  requirementKey: key,
  displayName: key.replaceAll('_', ' '),
  stage: 'deployment',
  requirementType: 'document',
  responsibleParty: 'applicant',
  required: true,
  sortOrder: 10,
  active: true,
  metadata: { training_credential: true, evidence_required: true, expiry_applicable: true, expiry_warning_days: 45, deployment_blocking: false },
  ...overrides,
});
const shared = requirement('training_induction');
const nmc = requirement('nmc_registration_valid', { id: 'req-nmc', roleId: 'role-nurse', sortOrder: 20, requirementType: 'office_verification', responsibleParty: 'administrator', metadata: { training_credential: true, credential_source: 'existing_compliance', evidence_required: false, expiry_applicable: true, expiry_warning_days: 45, deployment_blocking: true } });
const care: RoleTemplate = { id: 'role-care', role: 'Care Assistant / Care Worker', slug: 'care-assistant-care-worker', description: '', salaryRange: '', responsibilities: [], requiredCredentials: [], active: true, requirements: [shared] };
const nurse: RoleTemplate = { ...care, id: 'role-nurse', role: 'Nurse', slug: 'nurse', requirements: [{ ...shared, id: 'req-nurse-induction', roleId: 'role-nurse' }, nmc] };
const record = (overrides: Partial<StaffTrainingRecord> = {}): StaffTrainingRecord => ({ id: 'record-1', userId: 'user-1', staffProfileId: 'staff-1', roleRequirementId: shared.id!, provider: 'SHC', issueDate: '2026-01-01', expiryDate: '2027-01-01', evidenceDocumentId: '11111111-1111-4111-8111-111111111111', verificationStatus: 'Verified', ...overrides });
const nmcRecord: ComplianceRecord = { id: 'nmc-record', complianceCaseId: 'case-1', roleRequirementId: nmc.id, requirementKey: nmc.requirementKey, displayName: 'Valid NMC registration', stage: 'deployment', responsibleParty: 'administrator', sourceKind: 'professional_registration', status: 'Verified', verifiedAt: '2026-08-01T00:00:00Z', expiryDate: '2027-08-01', blocking: true, applicantMessage: 'Verified by SHC.', createdAt: '', updatedAt: '' };

// Care/shared and Nurse-specific role isolation.
assert.deepEqual(roleTrainingRequirements(care).map(entry => entry.requirementKey), ['training_induction']);
assert.deepEqual(roleTrainingRequirements(nurse).map(entry => entry.requirementKey), ['training_induction', 'nmc_registration_valid']);
assert.equal(deriveTrainingCredentials({ role: care }).some(item => item.requirement.requirementKey.includes('nmc')), false);
assert.equal(deriveTrainingCredentials({ role: nurse, complianceRecords: [nmcRecord] }).find(item => item.requirement.requirementKey === 'nmc_registration_valid')?.status, 'Valid');

// Missing, awaiting, valid, expiring and expired states are deterministic.
const now = new Date('2026-08-16T12:00:00Z');
assert.equal(deriveTrainingCredentials({ role: care, now })[0].status, 'Not Recorded');
assert.equal(deriveTrainingCredentials({ role: { ...care, requirements: [{ ...shared, required: false }] }, now })[0].status, 'Not Recorded', 'optional historical items remain honestly Not Recorded');
assert.equal(deriveTrainingCredentials({ role: care, records: [record({ verificationStatus: 'Awaiting Verification', verifiedBy: undefined, verifiedAt: undefined })], now })[0].status, 'Awaiting Verification');
assert.equal(statusFromVerifiedDates('2027-01-01', true, 45, now), 'Valid');
assert.equal(statusFromVerifiedDates('2026-09-01', true, 45, now), 'Expiring Soon');
assert.equal(statusFromVerifiedDates('2026-08-15', true, 45, now), 'Expired');

// Only explicitly deployment-blocking mandatory requirements affect the training gate.
const optionalExpired = deriveTrainingCredentials({ role: { ...care, requirements: [{ ...shared, required: false, metadata: { ...shared.metadata, deployment_blocking: true } }] }, records: [record({ expiryDate: '2026-08-15' })], now });
assert.equal(trainingDeploymentSatisfied(optionalExpired), true);
const blockingExpired = deriveTrainingCredentials({ role: { ...care, requirements: [{ ...shared, metadata: { ...shared.metadata, deployment_blocking: true } }] }, records: [record({ expiryDate: '2026-08-15' })], now });
assert.equal(trainingDeploymentSatisfied(blockingExpired), false);

// Migration-level access and evidence controls.
const migration = readFileSync(new URL('../supabase/migrations/20260816180000_sprint_4c_training_credentials.sql', import.meta.url), 'utf8');
assert.match(migration, /evidence_document_id uuid references public\.documents\(id\) on delete restrict/);
assert.match(migration, /staff_training_records_select[\s\S]*auth\.uid\(\)\) = user_id/);
assert.match(migration, /Staff cannot alter training ownership or verification/);
assert.match(migration, /Only an active administrator may verify training evidence/);
assert.match(migration, /s\.user_id = \(select auth\.uid\(\)\)[\s\S]*s\.role_id = rr\.role_id/);
assert.match(migration, /d\.id = evidence_document_id and d\.user_id = \(select auth\.uid\(\)\)/);
assert.match(migration, /credential_source', 'existing_compliance'/);

console.log('Sprint 4C training and credential scenarios passed.');
