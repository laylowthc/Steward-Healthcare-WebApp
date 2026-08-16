import assert from 'node:assert/strict';
import { adminNavigationItems, adminTabFromHash, PERSONNEL_FILES_HASH } from '../src/lib/adminNavigation';
import { reviewerDisplayName } from '../src/lib/reviewerDisplay';
import { nmcPresentation } from '../src/lib/officialApplicationPresentation';
import { OfficialApplicationData } from '../src/types/officialApplication';
import { RoleTemplate } from '../src/types';

const careRole: RoleTemplate = {
  id: 'care-role', role: 'Care Assistant / Care Worker', description: '', salaryRange: '', responsibilities: [], requiredCredentials: [], active: true,
  requirements: [{ id: 'rtw', roleId: 'care-role', requirementKey: 'right_to_work_verification', displayName: 'Right to Work', stage: 'deployment', requirementType: 'office_verification', responsibleParty: 'administrator', required: true, sortOrder: 1, metadata: {}, active: true }],
};
const nurseRole: RoleTemplate = {
  id: 'nurse-role', role: 'Nurse', description: '', salaryRange: '', responsibilities: [], requiredCredentials: [], active: true,
  requirements: [{ id: 'nmc', roleId: 'nurse-role', requirementKey: 'nmc_pin', displayName: 'NMC PIN', stage: 'application', requirementType: 'professional_registration', responsibleParty: 'applicant', required: true, sortOrder: 1, metadata: {}, active: true }],
};
const application = (role: RoleTemplate, patch: Partial<OfficialApplicationData> = {}): OfficialApplicationData => ({
  userId: 'user-1', applicantId: 'applicant-1', roleId: role.id, positionApplied: role.role, vacancyReferenceLocation: '', sourceOfAdvertisement: '', title: '', forenames: 'Test', surname: 'Applicant', address: '', postcode: '', telephone: '', mobile: '', personalEmail: '', nationalInsuranceNumber: '', eligibleToWorkUk: true,
  nmcPin: '', rna: '', nmcExpiryDate: '', rightToWork: '', enhancedDbs: '', dbsIssueDate: '', recentEmployerNameAddress: '', recentEmployerPostcode: '', recentEmployerTelephone: '', recentEmployerDateFrom: '', recentEmployerDateTo: '', recentEmployerPositionTitle: '', recentEmployerPrimaryResponsibilities: '', recentEmployerSalary: '', recentEmployerNoticePeriod: '', recentEmployerReasonForLeaving: '', employmentHistory: [], professionalReferences: [], refereesAgreedToContact: false, personalStatement: '', knowsConnectedPerson: false, connectedPersonDetails: '', hasUnprotectedCriminalRecord: false, criminalRecordDetails: '', declarationConfirmed: false, referencesAndChecksAuthorised: false, satisfactoryChecksAcknowledged: false, dataProtectionConsent: false, signatureType: 'typed', signatureValue: '', printedName: '', signatureDate: '', currentStep: 1, status: 'Approved', revision: 1, reviewerNotes: '', createdAt: '', updatedAt: '',
  ...patch,
});

assert.ok(adminNavigationItems.some(item => item.id === 'personnel' && item.label === 'Personnel Files'), 'Personnel Files is an explicit shared admin destination');
assert.equal(adminTabFromHash(PERSONNEL_FILES_HASH), 'personnel', 'Personnel Files has an independently addressable hash route');
assert.equal(reviewerDisplayName('cc579b70-0000-4000-8000-000000000000', {}), 'SHC administrator', 'raw reviewer UUIDs are never presented');
assert.equal(reviewerDisplayName('cc579b70-0000-4000-8000-000000000000', { 'cc579b70-0000-4000-8000-000000000000': 'Leslie Mahembe' }), 'Leslie Mahembe');
assert.deepEqual(nmcPresentation(application(careRole), [careRole, nurseRole]), { required: false, hasSubmittedData: false, historicalOnly: false }, 'Care Assistant has no current NMC presentation');
assert.equal(nmcPresentation(application(careRole, { nmcPin: 'historical-pin', rna: 'RNA' }), [careRole, nurseRole]).historicalOnly, true, 'immutable historical Care Assistant NMC data is labelled rather than treated as required');
assert.equal(nmcPresentation(application(nurseRole), [careRole, nurseRole]).required, true, 'Nurse NMC presentation remains role-driven');

console.log('Sprint 4B presentation safety tests passed');
