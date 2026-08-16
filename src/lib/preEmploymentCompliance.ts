import { Document, RoleRequirement, RoleTemplate } from '../types';
import { HrOnboardingForm } from '../types/hrOnboarding';
import { JobDescription, JobDescriptionAcknowledgement } from '../types/jobDescription';
import { OfficialApplicationData } from '../types/officialApplication';
import {
  ComplianceRecord,
  ComplianceRequirementStatus,
  ReferenceVerification,
} from '../types/preEmploymentCompliance';
import { chronologyValidationMessages } from './continuousHistory';
import { activeRequirements } from './roleEngine';

export interface ComplianceDerivationInput {
  role?: RoleTemplate;
  application?: OfficialApplicationData | null;
  documents?: Document[];
  hrForms?: HrOnboardingForm[];
  currentJobDescription?: JobDescription | null;
  jobDescriptionAcknowledgements?: JobDescriptionAcknowledgement[];
  persistedRecords?: ComplianceRecord[];
  referenceVerifications?: ReferenceVerification[];
}

export interface DerivedComplianceRequirement {
  roleRequirementId?: string;
  requirementKey: string;
  displayName: string;
  stage: RoleRequirement['stage'];
  responsibleParty: RoleRequirement['responsibleParty'];
  status: ComplianceRequirementStatus;
  blocking: boolean;
  reason: string;
  sourceKind: 'derived' | 'document' | 'office_verification' | 'professional_registration' | 'manager_clearance';
  persistedRecord?: ComplianceRecord;
}

const satisfactoryReference = (reference: ReferenceVerification) =>
  Boolean(reference.requestedAt)
  && Boolean(reference.receivedAt)
  && reference.employmentDatesConfirmed
  && reference.reasonForLeavingConfirmed
  && Boolean(reference.signerName.trim())
  && reference.telephoneVerified
  && reference.outcome === 'Satisfactory';

const isApprovedHr = (form: HrOnboardingForm) => form.status === 'Approved';
const acceptedStatuses: ComplianceRequirementStatus[] = ['Verified', 'Waived / Exception Approved', 'Not Required'];

const persistedResult = (
  requirement: RoleRequirement,
  record: ComplianceRecord | undefined,
): Pick<DerivedComplianceRequirement, 'status' | 'reason' | 'sourceKind'> | null => {
  if (!record) return null;
  return {
    status: record.status,
    reason: record.applicantMessage || (
      acceptedStatuses.includes(record.status)
        ? 'SHC has completed this check.'
        : record.responsibleParty === 'administrator'
          ? 'Received — awaiting SHC verification.'
          : 'Action is still required.'
    ),
    sourceKind: record.sourceKind,
  };
};

const deriveRequirement = (
  requirement: RoleRequirement,
  input: ComplianceDerivationInput,
): DerivedComplianceRequirement => {
  const application = input.application;
  const documents = input.documents || [];
  const hrForms = input.hrForms || [];
  const persisted = (input.persistedRecords || []).find(record => record.requirementKey === requirement.requirementKey);
  const base = {
    roleRequirementId: requirement.id,
    requirementKey: requirement.requirementKey,
    displayName: requirement.displayName,
    stage: requirement.stage,
    responsibleParty: requirement.responsibleParty,
    blocking: requirement.required,
    persistedRecord: persisted,
  };

  switch (requirement.requirementKey) {
    case 'official_application': {
      const approved = application?.status === 'Approved';
      const received = Boolean(application && ['Submitted', 'Under Review', 'Approved'].includes(application.status));
      return { ...base, sourceKind: 'derived', status: approved ? 'Verified' : received ? 'Awaiting Review' : 'Awaiting Applicant', reason: approved ? 'Official application approved.' : received ? 'Application received and awaiting completion of SHC review.' : 'Official application has not been submitted.' };
    }
    case 'employment_history':
    case 'continuous_history': {
      const hasHistory = Boolean(application?.employmentHistory.length || application?.recentEmployerNameAddress.trim());
      const valid = Boolean(application && chronologyValidationMessages(application).length === 0);
      return { ...base, sourceKind: 'derived', status: valid ? 'Verified' : hasHistory ? 'Awaiting Applicant' : 'Not Started', reason: valid ? 'Continuous history includes secondary education and has no unexplained gaps.' : hasHistory ? 'The chronology still has missing or unexplained periods.' : 'Education and employment history has not been provided.' };
    }
    case 'professional_references': {
      const count = application?.professionalReferences.filter(reference => reference.fullName.trim() && reference.email.trim()).length || 0;
      const minimum = Number(requirement.metadata?.minimum || 2);
      return { ...base, sourceKind: 'derived', status: count >= minimum && application?.refereesAgreedToContact ? 'Verified' : count ? 'Awaiting Applicant' : 'Not Started', reason: count >= minimum && application?.refereesAgreedToContact ? `${count} referee records supplied and contact authorised.` : `${minimum} suitable referee records and contact authorisation are required.` };
    }
    case 'references_completed': {
      const references = input.referenceVerifications || [];
      const complete = [1, 2].every(number => references.some(reference => reference.referenceNumber === number && satisfactoryReference(reference)));
      if (complete) return { ...base, sourceKind: 'office_verification', status: 'Verified', reason: 'Two references were received, reviewed and independently verified by SHC.' };
      const hasConcern = references.some(reference => ['Concern Identified', 'Unsatisfactory'].includes(reference.outcome));
      return { ...base, sourceKind: 'office_verification', status: hasConcern ? 'Concern / Review Required' : references.some(reference => reference.receivedAt) ? 'Verification In Progress' : 'Awaiting Review', reason: hasConcern ? 'A reference requires authorised SHC review.' : 'Referee details are supplied; SHC must receive and independently verify both references.' };
    }
    case 'declaration_signature':
      return { ...base, sourceKind: 'derived', status: application?.declarationConfirmed && Boolean(application.signatureValue.trim()) ? 'Verified' : 'Awaiting Applicant', reason: application?.declarationConfirmed && application.signatureValue.trim() ? 'Applicant declaration and signature recorded.' : 'Applicant declaration and signature are outstanding.' };
    case 'job_description_ack': {
      const signed = Boolean(input.currentJobDescription && (input.jobDescriptionAcknowledgements || []).some(ack => ack.jobDescriptionId === input.currentJobDescription?.id));
      return { ...base, sourceKind: 'derived', status: signed ? 'Verified' : 'Awaiting Applicant', reason: signed ? `Current Job Description ${input.currentJobDescription?.version} signed.` : input.currentJobDescription ? 'The current role Job Description is awaiting acknowledgement.' : 'No current Job Description is published for this role.' };
    }
    case 'starter_paye_forms':
    case 'bank_details':
    case 'next_of_kin':
    case 'employment_declarations': {
      const configured = requirement.metadata?.form_types as string[] | undefined;
      const relevant = configured?.length ? hrForms.filter(form => configured.includes(form.formType)) : hrForms;
      const complete = relevant.length > 0 && relevant.every(isApprovedHr);
      return { ...base, sourceKind: 'derived', status: complete ? 'Verified' : relevant.some(form => form.status === 'Submitted') ? 'Awaiting Review' : relevant.length ? 'Awaiting Applicant' : 'Not Started', reason: complete ? 'Configured HR onboarding forms approved.' : 'Configured HR onboarding forms are not yet all approved.' };
    }
    case 'profile_photo': {
      const photo = documents.find(document => document.category === 'Profile Photo');
      return { ...base, sourceKind: 'document', status: !photo ? 'Awaiting Applicant' : photo.status === 'Approved' ? 'Verified' : 'Evidence Received', reason: !photo ? 'A recent profile photograph is required.' : photo.status === 'Approved' ? 'Recent profile photograph approved.' : 'Photograph received — awaiting SHC review.' };
    }
    case 'nmc_registration_information':
    case 'nmc_pin':
    case 'nmc_expiry': {
      const value = requirement.requirementKey === 'nmc_expiry' ? application?.nmcExpiryDate : application?.nmcPin;
      return { ...base, sourceKind: 'derived', status: value ? 'Verified' : 'Awaiting Applicant', reason: value ? 'Registration information supplied; professional verification is tracked separately.' : 'Required NMC registration information is missing.' };
    }
    default: {
      const stored = persistedResult(requirement, persisted);
      if (stored) return { ...base, ...stored };
      const source = requirement.metadata?.verification_source;
      const sourceKind = source === 'nmc' ? 'professional_registration' : source === 'manager_clearance' ? 'manager_clearance' : requirement.responsibleParty === 'administrator' ? 'office_verification' : 'document';
      return { ...base, sourceKind, status: requirement.responsibleParty === 'administrator' ? 'Awaiting Review' : 'Awaiting Applicant', reason: requirement.responsibleParty === 'administrator' ? 'SHC must complete and record this verification.' : 'Applicant action is required.' };
    }
  }
};

export const deriveComplianceChecklist = (input: ComplianceDerivationInput): DerivedComplianceRequirement[] =>
  activeRequirements(input.role).map(requirement => deriveRequirement(requirement, input));

export const requirementSatisfied = (requirement: DerivedComplianceRequirement) =>
  !requirement.blocking || acceptedStatuses.includes(requirement.status);

export const outstandingBlockingRequirements = (requirements: DerivedComplianceRequirement[]) =>
  requirements.filter(requirement => !requirementSatisfied(requirement) && requirement.requirementKey !== 'manager_clearance');

export const canManagerClear = (requirements: DerivedComplianceRequirement[]) =>
  outstandingBlockingRequirements(requirements).length === 0;

export const complianceSummary = (requirements: DerivedComplianceRequirement[]) => {
  const blocking = requirements.filter(requirement => requirement.blocking);
  const satisfied = blocking.filter(requirementSatisfied).length;
  return { total: blocking.length, satisfied, outstanding: blocking.length - satisfied };
};
