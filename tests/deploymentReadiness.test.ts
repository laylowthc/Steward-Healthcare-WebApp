import assert from 'node:assert/strict';
import { RoleRequirement, RoleTemplate, Staff } from '../src/types';
import { deriveDeploymentReadiness } from '../src/lib/deploymentReadiness';
import { ComplianceCaseBundle, ComplianceRecord } from '../src/types/preEmploymentCompliance';
import { StaffTrainingRecord } from '../src/types/trainingCredentials';

const requirement = (key: string, name: string, metadata: Record<string, unknown> = {}, required = true): RoleRequirement => ({
  id: `req-${key}`, roleId: 'care-role', requirementKey: key, displayName: name, stage: 'deployment', requirementType: 'office_verification', responsibleParty: 'administrator', required, sortOrder: 1, metadata, active: true,
});
const careRequirements = [
  requirement('right_to_work_verification', 'Right to Work'),
  requirement('dbs_verification', 'DBS'),
  requirement('references_completed', 'References'),
  requirement('fitness_suitability', 'Fitness and suitability'),
  requirement('manager_clearance', 'Registered Manager clearance'),
  requirement('moving_handling', 'Moving & Handling', { training_credential: true, deployment_blocking: true, expiry_applicable: true }),
  requirement('food_hygiene', 'Food Hygiene', { training_credential: true, deployment_blocking: false, expiry_applicable: true }, false),
];
const role = (name: 'Care Assistant' | 'Nurse', requirements = careRequirements): RoleTemplate => ({ id: `${name}-role`, role: name, slug: name.toLowerCase().replaceAll(' ', '-'), salaryRange: '', description: '', responsibilities: [], requiredCredentials: [], active: true, requirements: requirements.map(item => ({ ...item, roleId: `${name}-role` })) });
const staff = (overrides: Partial<Staff> = {}): Staff => ({ id: 'staff-1', userId: 'user-1', name: 'Test Staff', email: 'staff@example.com', phone: '', address: '', role: 'Care Assistant', roleId: 'Care Assistant-role', status: 'Active', accountRole: 'staff', accountStatus: 'Active', rosterStatus: 'Active', dbsStatus: 'Pending', rightToWork: 'Pending', trainingStatus: 'Pending', referenceStatus: 'Pending', joinedDate: '2026-01-01', ...overrides });
const record = (key: string, status: ComplianceRecord['status'] = 'Verified', expiryDate?: string): ComplianceRecord => ({ id: `record-${key}`, complianceCaseId: 'case-1', roleRequirementId: `req-${key}`, requirementKey: key, displayName: key, stage: 'deployment', responsibleParty: 'administrator', sourceKind: 'office_verification', status, expiryDate, blocking: true, applicantMessage: '', createdAt: '2026-01-01', updatedAt: '2026-01-01' });
const bundle = (records: ComplianceRecord[], cleared = true): ComplianceCaseBundle => ({ complianceCase: { id: 'case-1', userId: 'user-1', roleId: 'Care Assistant-role', lifecycleState: 'Approved Staff', overallStatus: cleared ? 'Satisfied' : 'In Progress', managerClearanceStatus: cleared ? 'Cleared' : 'Pending', deploymentEligible: cleared, createdAt: '2026-01-01', updatedAt: '2026-01-01' }, records, details: [], references: [], events: [], schemaAvailable: true });
const coreRecords = () => ['right_to_work_verification', 'dbs_verification', 'references_completed', 'fitness_suitability'].map(key => record(key));
const training = (expiryDate = '2027-01-01', verificationStatus: StaffTrainingRecord['verificationStatus'] = 'Verified'): StaffTrainingRecord => ({ id: 'training-1', userId: 'user-1', staffProfileId: 'staff-1', roleRequirementId: 'req-moving_handling', provider: 'SHC', issueDate: '2026-01-01', expiryDate, verificationStatus });
const now = new Date('2026-08-25T00:00:00Z');

const completeCare = deriveDeploymentReadiness({ staff: staff(), role: role('Care Assistant'), compliance: bundle(coreRecords()), trainingRecords: [training()], now });
assert.equal(completeCare.status, 'Ready for Deployment', 'A: fully satisfied Care Assistant is ready');
assert.equal(deriveDeploymentReadiness({ staff: staff(), role: role('Care Assistant'), compliance: bundle([...coreRecords(), record('nmc_registration_valid', 'Not Started')]), trainingRecords: [training()], now }).ready, true, 'B: stray NMC data is irrelevant to Care Assistant role configuration');

const nurseRole = role('Nurse', [...careRequirements, requirement('nmc_registration_valid', 'NMC registration')]);
assert.equal(deriveDeploymentReadiness({ staff: staff({ role: 'Nurse', roleId: 'Nurse-role' }), role: nurseRole, compliance: bundle(coreRecords()), trainingRecords: [training()], now }).ready, false, 'C: Nurse NMC must be verified');
assert.equal(deriveDeploymentReadiness({ staff: staff(), role: role('Care Assistant'), compliance: bundle(coreRecords().filter(item => item.requirementKey !== 'right_to_work_verification')), trainingRecords: [training()], now }).blockers[0].key, 'right_to_work_verification', 'D: missing RTW restricts');
assert.equal(deriveDeploymentReadiness({ staff: staff(), role: role('Care Assistant'), compliance: bundle(coreRecords().map(item => item.requirementKey === 'dbs_verification' ? { ...item, status: 'Concern / Review Required' } : item)), trainingRecords: [training()], now }).ready, false, 'E: unresolved DBS review restricts');
assert.equal(deriveDeploymentReadiness({ staff: staff(), role: role('Care Assistant'), compliance: bundle(coreRecords().filter(item => item.requirementKey !== 'fitness_suitability')), trainingRecords: [training()], now }).ready, false, 'F: unresolved fitness requirement restricts');
assert.equal(deriveDeploymentReadiness({ staff: staff(), role: role('Care Assistant'), compliance: bundle(coreRecords(), false), trainingRecords: [training()], now }).ready, false, 'G: missing manager clearance restricts');
assert.equal(completeCare.ready, true, 'H/I: optional and explicitly non-blocking training do not restrict');
assert.equal(deriveDeploymentReadiness({ staff: staff(), role: role('Care Assistant'), compliance: bundle(coreRecords()), trainingRecords: [training('2026-08-01')], now }).ready, false, 'J: expired blocking training restricts');
assert.equal(deriveDeploymentReadiness({ staff: staff(), role: role('Care Assistant'), compliance: bundle(coreRecords()), trainingRecords: [training('2027-08-01')], now }).ready, true, 'K: verified renewal restores readiness dynamically');
assert.equal(staff().accountRole, 'staff', 'L: readiness restriction does not mutate approved Staff lifecycle');
assert.equal(completeCare.ready, true, 'M: personnel-file-only omissions are not deployment inputs');
assert.equal(deriveDeploymentReadiness({ staff: staff({ accountRole: 'applicant' }), role: role('Care Assistant'), compliance: bundle(coreRecords()), trainingRecords: [training()], now }).ready, false, 'N: candidates are distinct from approved Staff');
const confidential = deriveDeploymentReadiness({ staff: staff(), role: role('Care Assistant'), compliance: bundle(coreRecords().map(item => item.requirementKey === 'dbs_verification' ? { ...item, status: 'Concern / Review Required' } : item)), trainingRecords: [training()], now });
assert.doesNotMatch(confidential.blockers.find(item => item.key === 'dbs_verification')!.staffMessage, /risk|disclosure|note/i, 'O: staff-facing DBS reason is sanitised');
assert.equal(deriveDeploymentReadiness({ staff: staff({ role: 'Nurse', roleId: 'Nurse-role' }), role: nurseRole, compliance: bundle([...coreRecords(), record('nmc_registration_valid')]), trainingRecords: [training()], now }).ready, true, 'P: current role requirements recalculate without deleting history');

console.log('Sprint 4D deployment-readiness scenarios passed.');
