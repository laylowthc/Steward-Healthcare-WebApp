import { Applicant, Document, RoleTemplate, Staff } from '../types';
import { HrOnboardingForm, HrOnboardingFormType } from '../types/hrOnboarding';
import { JobDescription, JobDescriptionAcknowledgement } from '../types/jobDescription';
import { OfficialApplicationData } from '../types/officialApplication';
import { ComplianceCaseBundle, ComplianceRecord, ComplianceRequirementStatus } from '../types/preEmploymentCompliance';
import { PersonnelChecklistItem, PersonnelFileCategory, PersonnelFileStatus, PersonnelFileSummary, PersonnelSourceRoute } from '../types/personnelFile';
import { chronologyValidationMessages } from './continuousHistory';
import { configuredHrForms } from './hrOnboarding';
import { hasRequirement } from './roleEngine';

export interface PersonnelFileInput {
  role?: RoleTemplate;
  applicant?: Applicant | null;
  staff?: Staff | null;
  application?: OfficialApplicationData | null;
  documents?: Document[];
  hrForms?: HrOnboardingForm[];
  currentJobDescription?: JobDescription | null;
  acknowledgements?: JobDescriptionAcknowledgement[];
  compliance?: ComplianceCaseBundle;
}

const completeStatuses = new Set<PersonnelFileStatus>(['Complete', 'Exception Approved', 'Not Required']);
const excludedStatuses = new Set<PersonnelFileStatus>(['Not Required', 'Not Applicable']);
const approvedDocument = (document?: Document) => Boolean(document && ['Approved', 'Signed', 'Completed'].includes(document.status));
const source = (workflow: string, route: PersonnelSourceRoute, recordId?: string, timestamp?: string, evidenceId?: string, reviewerId?: string) => ({ workflow, route, recordId, timestamp, evidenceId, reviewerId });
const item = (value: PersonnelChecklistItem) => value;

const complianceStatus = (status?: ComplianceRequirementStatus): PersonnelFileStatus => {
  switch (status) {
    case 'Verified': return 'Complete';
    case 'Waived / Exception Approved': return 'Exception Approved';
    case 'Not Required': return 'Not Required';
    case 'Awaiting Applicant': return 'Awaiting Applicant';
    case 'Evidence Received':
    case 'Awaiting Review': return 'Awaiting SHC Review';
    case 'Verification In Progress': return 'Verification Required';
    case 'Concern / Review Required':
    case 'Failed / Unsatisfactory': return 'Concern / Review Required';
    case 'Expiring': return 'Expiring';
    case 'Expired': return 'Expired';
    case 'Not Started': return 'Outstanding';
    default: return 'Not Recorded';
  }
};

const complianceItem = (
  records: ComplianceRecord[], key: string, displayName: string, category: PersonnelFileCategory,
  options: { blocking?: boolean; responsibleParty?: 'applicant' | 'administrator'; fallback?: PersonnelFileStatus; reason?: string } = {},
) => {
  const record = records.find(entry => entry.requirementKey === key);
  return item({
    key, displayName, category,
    status: record ? complianceStatus(record.status) : (options.fallback || 'Not Recorded'),
    reason: record?.applicantMessage || options.reason || (record ? `Recorded by the ${record.sourceKind.replaceAll('_', ' ')} workflow.` : 'No authoritative record has been created.'),
    blocking: options.blocking ?? Boolean(record?.blocking),
    responsibleParty: options.responsibleParty || record?.responsibleParty || 'administrator',
    derivation: record ? 'auto-derived' : 'admin-recorded',
    source: source('Sprint 4A compliance', 'compliance', record?.id, record?.updatedAt, record?.evidenceDocumentId, record?.verifiedBy),
  });
};

const documentItem = (documents: Document[], key: string, displayName: string, category: PersonnelFileCategory, match: (document: Document) => boolean, blocking = false) => {
  const document = documents.find(match);
  const status: PersonnelFileStatus = !document ? 'Not Recorded' : approvedDocument(document) ? 'Complete' : document.status === 'Expired' ? 'Expired' : 'Awaiting SHC Review';
  return item({ key, displayName, category, status, blocking, responsibleParty: 'administrator', derivation: 'auto-derived',
    reason: !document ? 'No controlled document is recorded.' : approvedDocument(document) ? `${document.name} is retained and approved.` : `${document.name} is retained with status ${document.status}.`,
    source: source('Document Vault', 'documents', document?.id, document?.uploadDate, document?.id),
  });
};

const hrStatus = (form?: HrOnboardingForm): PersonnelFileStatus => {
  if (!form) return 'Outstanding';
  if (form.status === 'Approved') return 'Complete';
  if (form.status === 'Returned for Correction') return 'Returned for Correction';
  if (form.status === 'Submitted') return 'Awaiting SHC Review';
  if (form.status === 'Rejected') return 'Concern / Review Required';
  return 'In Progress';
};

const hrItem = (forms: HrOnboardingForm[], type: HrOnboardingFormType, title: string) => {
  const form = forms.find(entry => entry.formType === type);
  return item({ key: `hr_${type}`, displayName: title, category: 'HR Onboarding', status: hrStatus(form), blocking: true,
    responsibleParty: 'applicant', derivation: 'auto-derived',
    reason: !form ? 'Required onboarding form has not been started.' : form.status === 'Approved' ? `Approved revision ${form.revision}.` : `Current revision ${form.revision} is ${form.status}.`,
    source: source('HR Onboarding', 'hr_onboarding', form?.id, form?.reviewedAt || form?.updatedAt, undefined, form?.reviewedBy),
  });
};

const roleRequirementKey: Partial<Record<string, string>> = {
  application_form: 'official_application',
  continuous_history: 'employment_history',
  referee_details: 'professional_references',
  references_completed: 'references_completed',
  shortlisting_record: 'shortlisting_record',
  interview_record: 'interview_record',
  right_to_work_verification: 'right_to_work_verification',
  dbs_verification: 'dbs_verification',
  nmc_registration_valid: 'nmc_registration_valid',
  fitness_suitability: 'fitness_suitability',
  manager_clearance: 'manager_clearance',
  job_description: 'job_description_ack',
  training_records: 'mandatory_training',
};

export const derivePersonnelFile = (input: PersonnelFileInput): PersonnelChecklistItem[] => {
  const application = input.application;
  const documents = input.documents || [];
  const forms = input.hrForms || [];
  const records = input.compliance?.records || [];
  const references = input.compliance?.references || [];
  const role = input.role;
  const suppliedReferences = application?.professionalReferences.filter(ref => ref.fullName.trim() && (ref.email.trim() || ref.telephone.trim())).length || 0;
  const verifiedReferences = references.filter(ref => ref.outcome === 'Satisfactory' && ref.telephoneVerified && ref.receivedAt).length;
  const applicationComplete = application?.status === 'Approved';
  const historyComplete = Boolean(application && chronologyValidationMessages(application).length === 0);
  const currentJdSigned = Boolean(input.currentJobDescription && (input.acknowledgements || []).some(ack => ack.jobDescriptionId === input.currentJobDescription?.id));
  const result: PersonnelChecklistItem[] = [
    item({ key: 'application_form', displayName: 'Official Application', category: 'Recruitment', status: applicationComplete ? 'Complete' : application ? 'In Progress' : 'Not Recorded', blocking: true, responsibleParty: 'applicant', derivation: 'auto-derived', reason: applicationComplete ? `Approved application revision ${application?.revision}.` : application ? `Application is ${application.status}.` : 'No official application is recorded.', source: source('Official Application', 'application', application?.id, application?.reviewedAt || application?.updatedAt, undefined, application?.reviewedBy) }),
    item({ key: 'continuous_history', displayName: 'Employment / Education History', category: 'Recruitment', status: historyComplete ? 'Complete' : application ? 'Outstanding' : 'Not Recorded', blocking: true, responsibleParty: 'applicant', derivation: 'auto-derived', reason: historyComplete ? 'Secondary education is present and the chronology has no unexplained gaps.' : application ? chronologyValidationMessages(application)[0] || 'History is incomplete.' : 'No application history is recorded.', source: source('Continuous History', 'application', application?.id, application?.updatedAt) }),
    item({ key: 'referee_details', displayName: 'Referee Details', category: 'Recruitment', status: suppliedReferences >= 2 && application?.refereesAgreedToContact ? 'Complete' : suppliedReferences ? 'In Progress' : 'Not Recorded', blocking: true, responsibleParty: 'applicant', derivation: 'auto-derived', reason: suppliedReferences >= 2 && application?.refereesAgreedToContact ? 'Two referee records and contact authority are present.' : `${suppliedReferences} of 2 referee records are present.`, source: source('Official Application', 'application', application?.id, application?.updatedAt) }),
    item({ key: 'references_completed', displayName: 'Reference Verification', category: 'Recruitment', status: verifiedReferences >= 2 ? 'Complete' : references.some(ref => ref.receivedAt) ? 'Verification Required' : 'Not Recorded', blocking: true, responsibleParty: 'administrator', derivation: 'auto-derived', reason: verifiedReferences >= 2 ? 'Both references were received and independently verified.' : `${verifiedReferences} of 2 references meet the SHC verification standard.`, source: source('Reference Verification', 'compliance', records.find(r => r.requirementKey === 'references_completed')?.id, references.map(ref => ref.verifiedAt).filter(Boolean).sort().at(-1)) }),
    complianceItem(records, 'shortlisting_record', 'Shortlisting Record', 'Recruitment', { reason: 'Shortlisting evidence must be recorded by SHC.' }),
    complianceItem(records, 'interview_record', 'Interview Record', 'Recruitment', { reason: 'Interview paperwork must be retained by SHC.' }),
    item({ key: 'recruitment_decision', displayName: 'Recruitment Decision', category: 'Recruitment', status: input.applicant?.status === 'Accepted' ? 'Complete' : applicationComplete ? 'In Progress' : 'Outstanding', blocking: false, responsibleParty: 'administrator', derivation: 'auto-derived', reason: input.applicant?.status === 'Accepted' ? 'Applicant has been formally accepted into the staff lifecycle.' : applicationComplete ? 'Application approved; recruitment acceptance remains a separate decision.' : 'Recruitment decision has not been completed.', source: source('Recruitment Pipeline', 'recruitment', input.applicant?.id, input.applicant?.dateCreated) }),
    documentItem(documents, 'profile_photo', 'Recent Photograph', 'Identity / Pre-employment', doc => doc.category === 'Profile Photo', true),
    complianceItem(records, 'right_to_work_verification', 'Right to Work', 'Identity / Pre-employment', { blocking: true }),
    complianceItem(records, 'dbs_verification', 'DBS / Vulnerable Adults Clearance', 'Identity / Pre-employment', { blocking: true }),
    ...(hasRequirement(role, 'nmc_registration_valid') ? [complianceItem(records, 'nmc_registration_valid', 'Professional Registration', 'Identity / Pre-employment', { blocking: true })] : []),
    complianceItem(records, 'fitness_suitability', 'Fitness / Role Suitability', 'Identity / Pre-employment', { blocking: true }),
    complianceItem(records, 'manager_clearance', 'Pre-employment Manager Clearance', 'Identity / Pre-employment', { blocking: true }),
    ...configuredHrForms(role).map(definition => hrItem(forms, definition.type, definition.title)),
    item({ key: 'job_description', displayName: 'Role Job Description', category: 'HR Onboarding', status: currentJdSigned ? 'Complete' : input.currentJobDescription ? 'Awaiting Applicant' : 'Not Recorded', blocking: true, responsibleParty: 'applicant', derivation: 'auto-derived', reason: currentJdSigned ? `Current version ${input.currentJobDescription?.version} is signed.` : input.currentJobDescription ? `Version ${input.currentJobDescription.version} awaits signature.` : 'No current Job Description is published for this role.', source: source('Job Description', 'job_description', input.currentJobDescription?.id, input.currentJobDescription?.updatedAt) }),
    documentItem(documents, 'conditional_offer', 'Conditional Offer / Appointment Letter', 'Employment Documents', doc => /conditional offer|appointment letter|offer letter/i.test(`${doc.category} ${doc.name}`)),
    documentItem(documents, 'employment_contract', 'Employment Contract', 'Employment Documents', doc => doc.category === 'Employment Contract' || /employment contract|signed contract/i.test(doc.name), true),
    documentItem(documents, 'variation_terms', 'Variation of Terms', 'Employment Documents', doc => /variation of terms|variation of t&c/i.test(doc.name)),
    { ...complianceItem(records, 'mandatory_training', 'Mandatory Training / Credentials', 'Ongoing Staff Record', { blocking: hasRequirement(role, 'mandatory_training'), reason: 'Role-configured training evidence and verification remain outstanding; detailed credential control is scheduled for Sprint 4C.' }), key: 'training_records' },
    item({ key: 'supervision_appraisal', displayName: 'Supervision / Appraisal', category: 'Ongoing Staff Record', status: 'Not Applicable', blocking: false, responsibleParty: 'administrator', derivation: 'future-workflow', reason: 'Ongoing personnel workflows are scheduled for Sprint 6.', source: source('Future personnel workflow', 'documents') }),
    item({ key: 'sickness_employee_relations', displayName: 'Sickness / Employee Relations', category: 'Ongoing Staff Record', status: 'Not Applicable', blocking: false, responsibleParty: 'administrator', derivation: 'future-workflow', reason: 'Sickness, disciplinary and grievance workflows are not yet active.', source: source('Future personnel workflow', 'documents') }),
  ];
  return result.map(entry => {
    const requirementKey = roleRequirementKey[entry.key];
    if (!role || !requirementKey || hasRequirement(role, requirementKey)) return entry;
    return {
      ...entry,
      status: 'Not Required' as const,
      blocking: false,
      reason: 'This control is not configured as a requirement for the selected role.',
    };
  });
};

export const summarisePersonnelFile = (items: PersonnelChecklistItem[]): PersonnelFileSummary => {
  const applicable = items.filter(entry => !excludedStatuses.has(entry.status));
  const requiredItems = applicable.filter(entry => entry.blocking);
  const complete = requiredItems.filter(entry => completeStatuses.has(entry.status)).length;
  const categories = Array.from(new Set(items.map(entry => entry.category))).map(category => {
    const categoryItems = items.filter(entry => entry.category === category);
    const categoryRequired = categoryItems.filter(entry => entry.blocking && !excludedStatuses.has(entry.status));
    const categoryComplete = categoryRequired.filter(entry => completeStatuses.has(entry.status)).length;
    return { category, required: categoryRequired.length, complete: categoryComplete, outstanding: categoryRequired.length - categoryComplete, notApplicable: categoryItems.filter(entry => excludedStatuses.has(entry.status)).length };
  });
  return {
    required: requiredItems.length,
    complete,
    outstanding: requiredItems.length - complete,
    awaitingVerification: requiredItems.filter(entry => ['Awaiting SHC Review', 'Verification Required'].includes(entry.status)).length,
    percentage: requiredItems.length ? Math.round((complete / requiredItems.length) * 100) : 0,
    categories,
    blockers: requiredItems.filter(entry => !completeStatuses.has(entry.status)).slice(0, 5),
  };
};
