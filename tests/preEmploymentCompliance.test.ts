import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Document, RoleRequirement, RoleTemplate } from '../src/types';
import { deriveComplianceChecklist, canManagerClear, outstandingBlockingRequirements } from '../src/lib/preEmploymentCompliance';
import { ComplianceRecord, ReferenceVerification } from '../src/types/preEmploymentCompliance';
import { OfficialApplicationData } from '../src/types/officialApplication';

const requirement = (key: string, overrides: Partial<RoleRequirement> = {}): RoleRequirement => ({
  id: `req-${key}`, roleId: 'role-care', requirementKey: key, displayName: key.replaceAll('_', ' '),
  stage: 'deployment', requirementType: 'office_verification', responsibleParty: 'administrator',
  required: true, sortOrder: 1, metadata: {}, active: true, ...overrides,
});
const careRequirements = [
  requirement('official_application', { stage: 'application', requirementType: 'hr_form', responsibleParty: 'applicant' }),
  requirement('continuous_history', { stage: 'application', requirementType: 'information_field', responsibleParty: 'applicant' }),
  requirement('professional_references', { stage: 'application', requirementType: 'information_field', responsibleParty: 'applicant', metadata: { minimum: 2 } }),
  requirement('references_completed', { metadata: { verification_source: 'references' } }),
  requirement('right_to_work_verification', { metadata: { verification_source: 'right_to_work' } }),
  requirement('dbs_verification', { metadata: { verification_source: 'dbs' } }),
  requirement('fitness_suitability', { metadata: { verification_source: 'fitness' } }),
  requirement('manager_clearance', { metadata: { verification_source: 'manager_clearance' } }),
];
const careRole: RoleTemplate = { id: 'role-care', role: 'Care Assistant / Care Worker', slug: 'care-assistant-care-worker', description: '', salaryRange: '', responsibilities: [], active: true, requiredCredentials: [], requirements: careRequirements };
const nurseRole: RoleTemplate = { ...careRole, id: 'role-nurse', role: 'Nurse', slug: 'nurse', requirements: [...careRequirements.map(item => ({ ...item, roleId: 'role-nurse' })), requirement('nmc_registration_information', { roleId: 'role-nurse', stage: 'application', requirementType: 'professional_registration', responsibleParty: 'applicant' }), requirement('nmc_registration_valid', { roleId: 'role-nurse', metadata: { verification_source: 'nmc' } })] };

const application = (overrides: Partial<OfficialApplicationData> = {}): OfficialApplicationData => ({
  userId: 'user-1', applicantId: 'app-1', roleId: 'role-care', positionApplied: 'Care Assistant / Care Worker', vacancyReferenceLocation: '', sourceOfAdvertisement: '', title: 'Ms', forenames: 'Test', surname: 'Applicant', address: '1 Test Road', postcode: 'TE1 1ST', telephone: '', mobile: '07000000000', personalEmail: 'test@example.com', nationalInsuranceNumber: 'QQ123456C', eligibleToWorkUk: true,
  nmcPin: '', rna: '', nmcExpiryDate: '', rightToWork: '', enhancedDbs: '', dbsIssueDate: '', recentEmployerNameAddress: '', recentEmployerPostcode: '', recentEmployerTelephone: '', recentEmployerDateFrom: '', recentEmployerDateTo: '', recentEmployerPositionTitle: '', recentEmployerPrimaryResponsibilities: '', recentEmployerSalary: '', recentEmployerNoticePeriod: '', recentEmployerReasonForLeaving: '',
  employmentHistory: [
    { id: 'school', type: 'secondary_education', organisation: 'Test School', title: 'GCSEs', startMonth: '2018-09', endMonth: '2022-06', isCurrent: false, location: '', details: '', reasonForLeaving: '' },
    { id: 'work', type: 'employment', organisation: 'Care Ltd', title: 'Care Assistant', startMonth: '2022-07', endMonth: '', isCurrent: true, location: '', details: '', reasonForLeaving: '' },
  ],
  professionalReferences: [
    { fullName: 'Ref One', position: 'Manager', organisation: 'Care Ltd', relationshipToApplicant: 'Manager', telephone: '0701', email: 'one@example.com' },
    { fullName: 'Ref Two', position: 'Tutor', organisation: 'College', relationshipToApplicant: 'Tutor', telephone: '0702', email: 'two@example.com' },
  ], refereesAgreedToContact: true, personalStatement: '', knowsConnectedPerson: false, connectedPersonDetails: '', hasUnprotectedCriminalRecord: false, criminalRecordDetails: '', declarationConfirmed: true, referencesAndChecksAuthorised: true, satisfactoryChecksAcknowledged: true, dataProtectionConsent: true, signatureType: 'typed', signatureValue: 'Test Applicant', printedName: 'Test Applicant', signatureDate: '2026-08-15', currentStep: 9, status: 'Approved', revision: 1,
  ...overrides,
});
const record = (key: string, status: ComplianceRecord['status']): ComplianceRecord => ({ id: `record-${key}`, complianceCaseId: 'case-1', requirementKey: key, displayName: key, stage: 'deployment', responsibleParty: 'administrator', sourceKind: key === 'manager_clearance' ? 'manager_clearance' : 'office_verification', status, blocking: true, applicantMessage: '', createdAt: '', updatedAt: '' });
const verifiedReference = (number: 1 | 2): ReferenceVerification => ({ complianceCaseId: 'case-1', referenceNumber: number, requestedAt: '2026-08-01T00:00:00Z', receivedAt: '2026-08-05T00:00:00Z', refereeNameSnapshot: `Ref ${number}`, refereeOrganisationSnapshot: 'Organisation', employmentDatesConfirmed: true, reasonForLeavingConfirmed: true, signerName: 'Referee', signerRole: 'Manager', telephoneVerified: true, outcome: 'Satisfactory', internalNotes: '' });

// A: complete Care Assistant case, with explicit office decisions, is eligible for manager clearance.
const completeRecords = ['right_to_work_verification','dbs_verification','fitness_suitability'].map(key => record(key, 'Verified'));
const complete = deriveComplianceChecklist({ role: careRole, application: application(), persistedRecords: completeRecords, referenceVerifications: [verifiedReference(1), verifiedReference(2)] });
assert.equal(canManagerClear(complete), true);

// B: supplied referee details do not satisfy independent verification.
const missingReferences = deriveComplianceChecklist({ role: careRole, application: application(), persistedRecords: completeRecords, referenceVerifications: [] });
assert.equal(missingReferences.find(item => item.requirementKey === 'professional_references')?.status, 'Verified');
assert.equal(missingReferences.find(item => item.requirementKey === 'references_completed')?.status, 'Awaiting Review');
assert.equal(canManagerClear(missingReferences), false);

// C: an uploaded RTW document is evidence, not verification.
const rtwDocument: Document = { id: '11111111-1111-4111-8111-111111111111', name: 'RTW evidence', category: 'Right To Work', staffId: 'app-1', uploadDate: '2026-08-15', status: 'Awaiting Review' };
const awaitingRtw = deriveComplianceChecklist({ role: careRole, application: application(), documents: [rtwDocument], persistedRecords: completeRecords.filter(item => item.requirementKey !== 'right_to_work_verification'), referenceVerifications: [verifiedReference(1), verifiedReference(2)] });
assert.equal(awaitingRtw.find(item => item.requirementKey === 'right_to_work_verification')?.status, 'Awaiting Review');

// D: a DBS disclosure creates review work; it does not auto-reject the applicant.
const disclosure = deriveComplianceChecklist({ role: careRole, application: application(), persistedRecords: [...completeRecords.filter(item => item.requirementKey !== 'dbs_verification'), record('dbs_verification', 'Concern / Review Required')], referenceVerifications: [verifiedReference(1), verifiedReference(2)] });
assert.equal(disclosure.find(item => item.requirementKey === 'dbs_verification')?.status, 'Concern / Review Required');
assert.equal(canManagerClear(disclosure), false);

// E: Nurse information and office verification remain separate; Care Assistant never receives NMC.
const nurse = deriveComplianceChecklist({ role: nurseRole, application: application({ roleId: 'role-nurse', positionApplied: 'Nurse', nmcPin: '12A3456E' }), persistedRecords: [...completeRecords, record('nmc_registration_valid', 'Awaiting Review')], referenceVerifications: [verifiedReference(1), verifiedReference(2)] });
assert.equal(nurse.find(item => item.requirementKey === 'nmc_registration_information')?.status, 'Verified');
assert.equal(nurse.find(item => item.requirementKey === 'nmc_registration_valid')?.status, 'Awaiting Review');
assert.equal(canManagerClear(nurse), false);
assert.equal(complete.some(item => item.requirementKey.startsWith('nmc')), false);

// J: legacy-shaped records without office decisions are never fabricated as compliant.
const legacy = deriveComplianceChecklist({ role: careRole, application: application(), persistedRecords: [], referenceVerifications: [] });
assert.ok(outstandingBlockingRequirements(legacy).some(item => item.requirementKey === 'dbs_verification'));

// F/G/H/I: migration-level privacy, permissions, audit and document relationships.
const migration = readFileSync(new URL('../supabase/migrations/20260815120000_sprint_4a_pre_employment_compliance.sql', import.meta.url), 'utf8');
assert.match(migration, /compliance_verification_details_admin_all/);
assert.match(migration, /reference_verifications_admin_all/);
assert.match(migration, /compliance_cases_select[\s\S]*auth\.uid\(\)\) = user_id/);
assert.match(migration, /admin_update_compliance_record/);
assert.match(migration, /insert into public\.compliance_events/);
assert.match(migration, /evidence_document_id uuid references public\.documents\(id\) on delete restrict/);
assert.match(migration, /Only an active administrator may update compliance verification/);
assert.match(migration, /Manager clearance requires every blocking pre-employment requirement to be satisfied/);

console.log('Sprint 4A pre-employment compliance scenarios passed.');
