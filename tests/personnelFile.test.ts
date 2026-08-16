import assert from 'node:assert/strict';
import { Applicant, Document, RoleRequirement, RoleTemplate } from '../src/types';
import { derivePersonnelFile, summarisePersonnelFile } from '../src/lib/personnelFile';
import { ComplianceCaseBundle, ComplianceRecord, ReferenceVerification } from '../src/types/preEmploymentCompliance';
import { OfficialApplicationData } from '../src/types/officialApplication';

const requirement = (key: string, stage: RoleRequirement['stage'] = 'deployment'): RoleRequirement => ({
  id: `req-${key}`, roleId: 'care-role', requirementKey: key, displayName: key,
  stage, requirementType: stage === 'onboarding' ? 'hr_form' : 'office_verification',
  responsibleParty: stage === 'onboarding' ? 'applicant' : 'administrator', required: true,
  sortOrder: 1, metadata: {}, active: true,
});
const shared = [
  requirement('official_application', 'application'), requirement('employment_history', 'application'), requirement('professional_references', 'application'),
  requirement('references_completed'), requirement('right_to_work_verification'), requirement('dbs_verification'),
  requirement('shortlisting_record'), requirement('interview_record'), requirement('fitness_suitability'), requirement('manager_clearance'), requirement('starter_information', 'onboarding'),
  requirement('bank_details', 'onboarding'), requirement('paye_declaration', 'onboarding'), requirement('next_of_kin', 'onboarding'),
  requirement('working_time_declaration', 'onboarding'), requirement('policy_acknowledgement', 'onboarding'), requirement('job_description_ack', 'onboarding'),
];
const careRole: RoleTemplate = { id: 'care-role', role: 'Care Assistant / Care Worker', slug: 'care-assistant', description: '', salaryRange: '', responsibilities: [], requiredCredentials: [], requirements: shared, active: true };
const nurseRole: RoleTemplate = { ...careRole, id: 'nurse-role', role: 'Nurse', slug: 'nurse', requirements: [...shared.map(entry => ({ ...entry, roleId: 'nurse-role' })), requirement('nmc_registration_valid')] };

const application: OfficialApplicationData = {
  id: 'application-1', userId: 'user-1', applicantId: 'applicant-1', roleId: 'care-role', positionApplied: careRole.role,
  vacancyReferenceLocation: '', sourceOfAdvertisement: '', title: 'Ms', forenames: 'Test', surname: 'Person', address: '1 Test Road', postcode: 'TE1 1ST', telephone: '', mobile: '07000000000', personalEmail: 'person@example.com', nationalInsuranceNumber: 'QQ123456C', eligibleToWorkUk: true,
  nmcPin: '', rna: '', nmcExpiryDate: '', rightToWork: '', enhancedDbs: '', dbsIssueDate: '', recentEmployerNameAddress: '', recentEmployerPostcode: '', recentEmployerTelephone: '', recentEmployerDateFrom: '', recentEmployerDateTo: '', recentEmployerPositionTitle: '', recentEmployerPrimaryResponsibilities: '', recentEmployerSalary: '', recentEmployerNoticePeriod: '', recentEmployerReasonForLeaving: '',
  employmentHistory: [
    { id: 'school', type: 'secondary_education', organisation: 'School', title: 'GCSE', startMonth: '2018-09', endMonth: '2022-06', isCurrent: false, location: '', details: '', reasonForLeaving: '' },
    { id: 'work', type: 'employment', organisation: 'Care Ltd', title: 'Carer', startMonth: '2022-07', endMonth: '', isCurrent: true, location: '', details: '', reasonForLeaving: '' },
  ],
  professionalReferences: [
    { fullName: 'Reference One', position: 'Manager', organisation: 'Care Ltd', relationshipToApplicant: 'Manager', telephone: '0701', email: 'one@example.com' },
    { fullName: 'Reference Two', position: 'Tutor', organisation: 'College', relationshipToApplicant: 'Tutor', telephone: '0702', email: 'two@example.com' },
  ], refereesAgreedToContact: true, personalStatement: '', knowsConnectedPerson: false, connectedPersonDetails: '', hasUnprotectedCriminalRecord: false, criminalRecordDetails: '', declarationConfirmed: true, referencesAndChecksAuthorised: true, satisfactoryChecksAcknowledged: true, dataProtectionConsent: true, signatureType: 'typed', signatureValue: 'Test Person', printedName: 'Test Person', signatureDate: '2026-08-15', currentStep: 9, status: 'Approved', revision: 2, updatedAt: '2026-08-15T00:00:00Z',
};
const applicant = { id: 'applicant-1', userId: 'user-1', name: 'Test Person', position: careRole.role, roleId: careRole.id, status: 'Accepted', dateCreated: '2026-08-15' } as Applicant;
const record = (key: string, status: ComplianceRecord['status'], evidenceDocumentId?: string): ComplianceRecord => ({ id: `record-${key}`, complianceCaseId: 'case-1', requirementKey: key, displayName: key, stage: 'deployment', responsibleParty: 'administrator', sourceKind: key === 'manager_clearance' ? 'manager_clearance' : 'office_verification', status, evidenceDocumentId, blocking: true, applicantMessage: status === 'Verified' ? 'Verified by SHC.' : 'Office action remains outstanding.', createdAt: '2026-08-15T00:00:00Z', updatedAt: '2026-08-15T00:00:00Z' });
const reference = (number: 1 | 2): ReferenceVerification => ({ id: `reference-${number}`, complianceCaseId: 'case-1', referenceNumber: number, refereeNameSnapshot: `Reference ${number}`, refereeOrganisationSnapshot: 'Employer', receivedAt: '2026-08-14T00:00:00Z', employmentDatesConfirmed: true, reasonForLeavingConfirmed: true, signerName: 'Manager', signerRole: 'Manager', telephoneVerified: true, verifiedAt: '2026-08-15T00:00:00Z', outcome: 'Satisfactory', internalNotes: '' });
const bundle = (records: ComplianceRecord[], references: ReferenceVerification[] = []): ComplianceCaseBundle => ({ complianceCase: null, records, references, details: [], events: [], schemaAvailable: true });
const document = (id: string, name: string, category: Document['category'], status: Document['status'] = 'Approved'): Document => ({ id, name, category, status, staffId: 'user-1', staffName: 'Test Person', uploadDate: '2026-08-15' });

// A/B: the approved application and valid chronology derive from immutable application state.
const base = derivePersonnelFile({ role: careRole, applicant, application });
assert.equal(base.find(item => item.key === 'application_form')?.status, 'Complete');
assert.equal(base.find(item => item.key === 'continuous_history')?.status, 'Complete');

// C: referee data is separate from independent office verification.
assert.equal(base.find(item => item.key === 'referee_details')?.status, 'Complete');
assert.notEqual(base.find(item => item.key === 'references_completed')?.status, 'Complete');
const withReferences = derivePersonnelFile({ role: careRole, applicant, application, compliance: bundle([], [reference(1), reference(2)]) });
assert.equal(withReferences.find(item => item.key === 'references_completed')?.status, 'Complete');

// D/E: evidence receipt is not verification; DBS concerns remain review work until a suitable decision exists.
const pendingRtw = derivePersonnelFile({ role: careRole, applicant, application, compliance: bundle([record('right_to_work_verification', 'Evidence Received', '11111111-1111-4111-8111-111111111111')]) });
assert.equal(pendingRtw.find(item => item.key === 'right_to_work_verification')?.status, 'Awaiting SHC Review');
assert.equal(pendingRtw.find(item => item.key === 'right_to_work_verification')?.source.evidenceId, '11111111-1111-4111-8111-111111111111');
const dbsConcern = derivePersonnelFile({ role: careRole, applicant, application, compliance: bundle([record('dbs_verification', 'Concern / Review Required')]) });
assert.equal(dbsConcern.find(item => item.key === 'dbs_verification')?.status, 'Concern / Review Required');
assert.equal(derivePersonnelFile({ role: careRole, compliance: bundle([record('dbs_verification', 'Verified')]) }).find(item => item.key === 'dbs_verification')?.status, 'Complete');

// F: a signature is for the exact current role JD version.
const jd = { id: 'jd-care-v2', roleId: careRole.id, title: 'Care Assistant Job Description', version: '2', content: { summary: '', reportsTo: '', duties: [], conduct: [] }, active: true, createdAt: '', updatedAt: '' };
const ack = { id: 'ack-1', jobDescriptionId: jd.id, userId: 'user-1', applicantId: 'applicant-1', roleId: careRole.id, roleName: careRole.role, jdTitle: jd.title, jdVersion: jd.version, contentSnapshot: jd.content, acknowledgementText: 'Acknowledged', acknowledgementVersion: '1', signatureType: 'typed' as const, signatureValue: 'Test Person', signerUserId: 'user-1', signerName: 'Test Person', signedAt: '', createdAt: '' };
assert.equal(derivePersonnelFile({ role: careRole, currentJobDescription: jd, acknowledgements: [ack] }).find(item => item.key === 'job_description')?.status, 'Complete');
assert.equal(derivePersonnelFile({ role: careRole, currentJobDescription: { ...jd, id: 'jd-care-v3', version: '3' }, acknowledgements: [ack] }).find(item => item.key === 'job_description')?.status, 'Awaiting Applicant');

// G/H: approved forms and persistent profile/document evidence are derived without exposing their payloads.
const secure = derivePersonnelFile({ role: careRole, documents: [document('photo-1', 'Profile photograph', 'Profile Photo'), document('contract-1', 'Employment Contract', 'Employment Contract')], hrForms: [{ id: 'bank-1', userId: 'user-1', formType: 'bank_details', status: 'Approved', formData: { accountNumber: '12345678', sortCode: '12-34-56' }, revision: 1, currentRevision: 1, createdAt: '', updatedAt: '' } as any] });
assert.equal(secure.find(item => item.key === 'profile_photo')?.status, 'Complete');
assert.equal(secure.find(item => item.key === 'employment_contract')?.status, 'Complete');
assert.doesNotMatch(JSON.stringify(secure), /12345678|12-34-56|QQ123456C/);

// I/J: NMC is configuration-driven and never leaks into Care Assistant files.
assert.equal(derivePersonnelFile({ role: careRole }).some(item => item.key === 'nmc_registration_valid'), false);
assert.equal(derivePersonnelFile({ role: nurseRole }).find(item => item.key === 'nmc_registration_valid')?.status, 'Not Recorded');

// L/M: links point back to controlled workflows and missing legacy evidence is truthful.
assert.equal(secure.find(item => item.key === 'employment_contract')?.source.route, 'documents');
assert.equal(base.find(item => item.key === 'shortlisting_record')?.status, 'Not Recorded');

// O: an audited Sprint 4A exception is visible but does not make deployment ready or rewrite the manager gate.
const excepted = derivePersonnelFile({ role: careRole, compliance: bundle([record('fitness_suitability', 'Waived / Exception Approved'), record('manager_clearance', 'Not Started')]) });
assert.equal(excepted.find(item => item.key === 'fitness_suitability')?.status, 'Exception Approved');
assert.equal(excepted.find(item => item.key === 'manager_clearance')?.status, 'Outstanding');
assert.ok(summarisePersonnelFile(excepted).outstanding > 0);

console.log('Sprint 4B personnel-file derivation scenarios passed.');
