import assert from 'node:assert/strict';
import { RoleTemplate } from '../src/types';
import {
  configuredHrForms,
  hrRequirementComplete,
  isHrOnboardingComplete,
  validateHrForm,
} from '../src/lib/hrOnboarding';
import { HrOnboardingForm } from '../src/types/hrOnboarding';
import { requirementProgress } from '../src/lib/roleEngine';

const role = {
  id: 'role-id', role: 'Configured Role', slug: 'configured-role', description: '', salaryRange: '', responsibilities: [], requiredCredentials: [], active: true,
  requirements: [
    { id: 'starter', roleId: 'role-id', requirementKey: 'starter_paye_forms', displayName: 'Starter and PAYE', stage: 'onboarding', requirementType: 'hr_form', responsibleParty: 'applicant', required: true, sortOrder: 10, metadata: { form_types: ['starter_information', 'paye_declaration'] }, active: true },
    { id: 'bank', roleId: 'role-id', requirementKey: 'bank_details', displayName: 'Bank details', stage: 'onboarding', requirementType: 'hr_form', responsibleParty: 'applicant', required: true, sortOrder: 20, metadata: { form_types: ['bank_details'], sensitive: true }, active: true },
    { id: 'policy', roleId: 'role-id', requirementKey: 'employment_declarations', displayName: 'Declarations', stage: 'onboarding', requirementType: 'hr_form', responsibleParty: 'applicant', required: true, sortOrder: 30, metadata: { form_types: ['working_time_declaration', 'policy_acknowledgement'], policies: [{ key: 'privacy', name: 'Privacy Policy', version: '2.0', statement: 'Read the policy.' }] }, active: true },
  ],
} as RoleTemplate;

const definitions = configuredHrForms(role);
assert.deepEqual(definitions.map(definition => definition.type), [
  'starter_information', 'paye_declaration', 'bank_details', 'working_time_declaration', 'policy_acknowledgement',
]);
assert.equal(definitions.find(item => item.type === 'policy_acknowledgement')?.policies?.[0].version, '2.0', 'policy configuration propagates without role-name code');

const starter = definitions.find(item => item.type === 'starter_information')!;
assert(validateHrForm('starter_information', {}, starter).includes('Full legal name'), 'incomplete starter draft has actionable validation');
assert.equal(validateHrForm('starter_information', {
  fullLegalName: 'Applicant Name', address: '1 Road', postcode: 'AB1 2CD', mobile: '07000000000', personalEmail: 'a@example.com',
  dateOfBirth: '1990-01-01', nationalInsuranceNumber: 'AB123456C', jobRole: 'Care Assistant', intendedStartDate: '2026-09-01',
  placeOfWork: 'SHC', relatedToShcPerson: 'No', previouslyWorkedForShc: 'No',
  employmentType: 'Permanent', emergencyContactName: 'Contact', emergencyContactRelationship: 'Sibling', emergencyContactPhone: '07111111111',
}, starter).length, 0, 'complete starter form validates');

const policy = definitions.find(item => item.type === 'policy_acknowledgement')!;
assert.equal(validateHrForm('policy_acknowledgement', { acknowledgements: [] }, policy).length, 1);
assert.equal(validateHrForm('policy_acknowledgement', { acknowledgements: [{ policyKey: 'privacy', policyVersion: '2.0', acknowledged: true }] }, policy).length, 0);

const form = (formType: HrOnboardingForm['formType'], status: HrOnboardingForm['status']): HrOnboardingForm => ({
  id: `${formType}-id`, userId: 'user-id', applicantId: 'applicant-id', roleId: 'role-id', formType, status, formData: {}, revision: 1,
});
const allApproved = definitions.map(definition => form(definition.type, 'Approved'));
assert.equal(isHrOnboardingComplete(role, allApproved), true, 'onboarding is complete only when configured forms are approved');
assert.equal(isHrOnboardingComplete(role, allApproved.map(item => item.formType === 'bank_details' ? { ...item, status: 'Submitted' } : item)), false, 'submitted is not cosmetically treated as approved');
assert.equal(hrRequirementComplete(role.requirements[0], allApproved), true);
assert.equal(requirementProgress(role.requirements[0], null, [], allApproved), 'Complete', 'role checklist reads persisted HR approvals');
assert.equal(requirementProgress(role.requirements[0], null, [], allApproved.map(item => item.formType === 'paye_declaration' ? { ...item, status: 'Submitted' } : item)), 'In Progress');
assert.equal(isHrOnboardingComplete({ ...role, requirements: [] }, []), false, 'no configured requirements does not silently mark onboarding complete');

console.log('HR onboarding scenarios passed.');
