import { RoleRequirement, RoleTemplate } from '../types';
import {
  HrFormDefinition,
  HrOnboardingForm,
  HrOnboardingFormType,
  HrPolicyDefinition,
} from '../types/hrOnboarding';

export const hrFormDefinitions: Record<HrOnboardingFormType, Omit<HrFormDefinition, 'policies'>> = {
  starter_information: {
    type: 'starter_information',
    title: 'Starter / New Employee Information',
    description: 'Personal, employment and emergency information required to create your employee record.',
    signatureRequired: true,
  },
  bank_details: {
    type: 'bank_details',
    title: 'Bank Details',
    description: 'Confidential bank information used by authorised SHC payroll administrators.',
    signatureRequired: true,
  },
  paye_declaration: {
    type: 'paye_declaration',
    title: 'PAYE / Starter Declaration (PAY 1B)',
    description: 'HMRC starter statement and student-loan declaration for payroll setup.',
    signatureRequired: true,
  },
  next_of_kin: {
    type: 'next_of_kin',
    title: 'Next of Kin / Emergency Contact',
    description: 'Primary and alternative contacts for use in an emergency.',
    signatureRequired: false,
  },
  working_time_declaration: {
    type: 'working_time_declaration',
    title: 'Working Time Declaration / 48-Hour Opt-Out',
    description: 'Your decision under the Working Time Regulations, recorded with your signature.',
    signatureRequired: true,
  },
  policy_acknowledgement: {
    type: 'policy_acknowledgement',
    title: 'SHC Policy Acknowledgements',
    description: 'Versioned acknowledgements for the policies configured by SHC.',
    signatureRequired: true,
  },
};

const isHrFormType = (value: unknown): value is HrOnboardingFormType =>
  typeof value === 'string' && value in hrFormDefinitions;

export const requirementHrFormTypes = (requirement: RoleRequirement) => {
  const configured = requirement.metadata?.form_types;
  return Array.isArray(configured) ? configured.filter(isHrFormType) : [];
};

const policiesFromRequirement = (requirement: RoleRequirement): HrPolicyDefinition[] => {
  const policies = requirement.metadata?.policies;
  if (!Array.isArray(policies)) return [];
  return policies.flatMap(policy => {
    if (!policy || typeof policy !== 'object' || !String(policy.key || '').trim()) return [];
    return [{
      key: String(policy.key),
      name: String(policy.name || policy.key),
      version: String(policy.version || 'Current'),
      statement: String(policy.statement || `I confirm that I have read and understood the ${policy.name || policy.key}.`),
    }];
  });
};

export const configuredHrForms = (role?: RoleTemplate): HrFormDefinition[] => {
  const definitions = new Map<HrOnboardingFormType, HrFormDefinition>();
  (role?.requirements || [])
    .filter(requirement => requirement.active !== false && requirement.stage === 'onboarding')
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName))
    .filter(requirement => requirement.responsibleParty === 'applicant')
    .forEach(requirement => {
      requirementHrFormTypes(requirement).forEach(type => {
        const base = hrFormDefinitions[type];
        const policies = type === 'policy_acknowledgement' ? policiesFromRequirement(requirement) : undefined;
        definitions.set(type, { ...base, ...(policies ? { policies } : {}) });
      });
    });
  return Array.from(definitions.values());
};

export const hrFormStatus = (
  formType: HrOnboardingFormType,
  forms: HrOnboardingForm[],
) => forms.find(form => form.formType === formType)?.status || 'Not Started';

export const hrRequirementComplete = (
  requirement: RoleRequirement,
  forms: HrOnboardingForm[],
) => {
  const types = requirementHrFormTypes(requirement);
  return types.length > 0 && types.every(type => hrFormStatus(type, forms) === 'Approved');
};

export const validateHrForm = (
  formType: HrOnboardingFormType,
  data: Record<string, any>,
  definition: HrFormDefinition,
) => {
  const errors: string[] = [];
  const required = (key: string, label: string) => {
    if (!String(data[key] ?? '').trim()) errors.push(label);
  };

  if (formType === 'starter_information') {
    [
      ['fullLegalName', 'Full legal name'], ['address', 'Address'], ['postcode', 'Postcode'],
      ['mobile', 'Mobile number'], ['personalEmail', 'Personal email'], ['dateOfBirth', 'Date of birth'],
      ['nationalInsuranceNumber', 'National Insurance number'], ['jobRole', 'Job role'],
      ['placeOfWork', 'Place of work / base'], ['relatedToShcPerson', 'Relationship to an SHC person declaration'],
      ['previouslyWorkedForShc', 'Previous SHC work declaration'],
      ['intendedStartDate', 'Intended start date'], ['employmentType', 'Employment type'],
      ['emergencyContactName', 'Emergency contact name'], ['emergencyContactRelationship', 'Emergency contact relationship'],
      ['emergencyContactPhone', 'Emergency contact telephone'],
    ].forEach(([key, label]) => required(key, label));
    if (data.relatedToShcPerson === 'Yes') required('relatedToShcPersonDetails', 'Relationship details');
    if (data.previouslyWorkedForShc === 'Yes') required('previousShcWorkDetails', 'Previous SHC work details');
  }
  if (formType === 'bank_details') {
    [['accountHolderName', 'Account holder name'], ['bankName', 'Bank / building society'], ['sortCode', 'Sort code'], ['accountNumber', 'Account number']]
      .forEach(([key, label]) => required(key, label));
    if (!data.payrollDeclaration) errors.push('Payroll declaration');
  }
  if (formType === 'paye_declaration') {
    required('starterStatement', 'Starter statement A, B or C');
    required('studentLoanOutstanding', 'Student loan answer');
    if (data.studentLoanOutstanding === 'Yes') {
      required('studentLoanPlan', 'Student loan plan');
      required('studentLoanDirectDebit', 'Student loan Direct Debit answer');
      required('studyCompletionDate', 'Study completion date');
    }
  }
  if (formType === 'next_of_kin') {
    [['fullName', 'Full name'], ['relationship', 'Relationship'], ['telephone', 'Telephone / mobile']]
      .forEach(([key, label]) => required(key, label));
  }
  if (formType === 'working_time_declaration') {
    required('workingTimeChoice', 'Working time option');
    if (!data.declarationRead) errors.push('Confirmation that the declaration was read');
  }
  if (formType === 'policy_acknowledgement') {
    const acknowledgements = Array.isArray(data.acknowledgements) ? data.acknowledgements : [];
    (definition.policies || []).forEach(policy => {
      if (!acknowledgements.some(item => item.policyKey === policy.key && item.policyVersion === policy.version && item.acknowledged === true)) {
        errors.push(`${policy.name} acknowledgement`);
      }
    });
  }
  return errors;
};

export const isHrOnboardingComplete = (role: RoleTemplate | undefined, forms: HrOnboardingForm[]) => {
  const required = (role?.requirements || [])
    .filter(requirement => requirement.active !== false && requirement.stage === 'onboarding')
    .filter(requirement => requirement.required && requirement.responsibleParty === 'applicant' && requirementHrFormTypes(requirement).length);
  return required.length > 0 && required.every(requirement => hrRequirementComplete(requirement, forms));
};
