import assert from 'node:assert/strict';
import { RoleTemplate } from '../src/types';
import { activeRequirements, findRole, hasRequirement, requirementProgress } from '../src/lib/roleEngine';
import { validateOfficialApplication } from '../src/lib/officialApplicationValidation';
import { OfficialApplicationData } from '../src/types/officialApplication';

const requirement = (requirementKey: string, displayName: string, responsibleParty: 'applicant' | 'administrator' = 'applicant') => ({
  requirementKey,
  displayName,
  stage: requirementKey.includes('verification') ? 'deployment' as const : 'application' as const,
  requirementType: responsibleParty === 'administrator' ? 'office_verification' as const : 'information_field' as const,
  responsibleParty,
  required: true,
  sortOrder: 10,
  metadata: requirementKey === 'professional_references' ? { minimum: 2 } : {},
  active: true
});

const nurse: RoleTemplate = {
  id: 'nurse-id', role: 'Nurse', slug: 'nurse', description: '', salaryRange: '', responsibilities: [], active: true,
  requiredCredentials: [],
  requirements: [
    requirement('official_application', 'Official application'),
    requirement('nmc_pin', 'NMC PIN'),
    requirement('nmc_expiry', 'NMC expiry'),
    requirement('professional_references', 'References'),
    requirement('declaration_signature', 'Declaration'),
    requirement('dbs_verification', 'DBS verification', 'administrator')
  ]
};
const care: RoleTemplate = {
  id: 'care-id', role: 'Care Assistant / Care Worker', slug: 'care-assistant-care-worker', description: '', salaryRange: '', responsibilities: [], active: true,
  requiredCredentials: [],
  requirements: nurse.requirements.filter(item => !item.requirementKey.startsWith('nmc_'))
};

const application = {
  id: 'application-id', userId: 'user-id', applicantId: 'applicant-id', roleId: care.id, positionApplied: care.role,
  forenames: 'A', surname: 'Applicant', address: '1 Road', postcode: 'AB1', mobile: '0700', personalEmail: 'a@example.com', eligibleToWorkUk: true,
  nmcPin: '', nmcExpiryDate: '', rna: '',
  professionalReferences: [
    { fullName: 'Ref One', position: '', organisation: '', relationshipToApplicant: '', telephone: '', email: 'one@example.com' },
    { fullName: 'Ref Two', position: '', organisation: '', relationshipToApplicant: '', telephone: '', email: 'two@example.com' }
  ],
  refereesAgreedToContact: true,
  knowsConnectedPerson: false, connectedPersonDetails: '', hasUnprotectedCriminalRecord: false, criminalRecordDetails: '',
  declarationConfirmed: true, referencesAndChecksAuthorised: true, satisfactoryChecksAcknowledged: true, dataProtectionConsent: true,
  signatureValue: 'Applicant', printedName: 'A Applicant',
  recentEmployerDateFrom: '', recentEmployerDateTo: '', recentEmployerNameAddress: '', recentEmployerPositionTitle: '',
  employmentHistory: [], status: 'Draft'
} as OfficialApplicationData;

assert.equal(findRole([nurse, care], care.id)?.id, care.id, 'role resolves by persistent ID');
assert.equal(hasRequirement(care, 'nmc_pin'), false, 'Care Assistant has no NMC requirement');
assert.equal(hasRequirement(nurse, 'nmc_pin'), true, 'Nurse has NMC requirement');
assert.equal(validateOfficialApplication(application, care).includes('NMC PIN'), false, 'Care Assistant submission is not blocked by NMC');

const nurseApplication = { ...application, roleId: nurse.id, positionApplied: nurse.role };
assert.equal(validateOfficialApplication(nurseApplication, nurse).includes('NMC PIN'), true, 'Nurse submission is blocked without NMC PIN');
assert.equal(validateOfficialApplication({ ...nurseApplication, nmcPin: '12A3456E', nmcExpiryDate: '2027-01-01' }, nurse).includes('NMC PIN'), false, 'Nurse NMC validation clears when supplied');
assert.equal(application.nmcPin, '', 'role switch does not delete previously stored fields');

const officeCheck = activeRequirements(nurse, 'deployment')[0];
assert.equal(requirementProgress(officeCheck, nurseApplication, []), 'Pending SHC Verification', 'office-owned deployment checks are not applicant errors');

const editedCare = { ...care, requirements: [...care.requirements, requirement('new_management_requirement', 'New management requirement')] };
assert.equal(activeRequirements(editedCare).some(item => item.requirementKey === 'new_management_requirement'), true, 'admin configuration changes drive requirements without role-name code');

console.log('Role engine scenarios passed.');
