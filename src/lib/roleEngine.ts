import { Document, RoleRequirement, RoleTemplate } from '../types';
import { OfficialApplicationData } from '../types/officialApplication';

export type RequirementProgress = 'Complete' | 'Missing' | 'In Progress' | 'Pending SHC Verification';

export const findRole = (
  roles: RoleTemplate[],
  roleId?: string,
  roleName?: string,
) => roles.find(role => role.id === roleId)
  || roles.find(role => role.role.toLowerCase() === (roleName || '').trim().toLowerCase());

export const activeRequirements = (
  role?: RoleTemplate,
  stage?: RoleRequirement['stage'],
) => (role?.requirements || [])
  .filter(requirement => requirement.active !== false && (!stage || requirement.stage === stage))
  .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));

export const hasRequirement = (
  role: RoleTemplate | undefined,
  requirementKeys: string | string[],
) => {
  const keys = Array.isArray(requirementKeys) ? requirementKeys : [requirementKeys];
  return activeRequirements(role).some(requirement => keys.includes(requirement.requirementKey));
};

const isApprovedDocument = (document: Document) =>
  document.status === 'Approved' || document.status === 'Signed' || document.status === 'Completed';

const documentStatus = (requirement: RoleRequirement, documents: Document[]): RequirementProgress => {
  const configured = requirement.metadata?.document_categories
    || (requirement.metadata?.document_category ? [requirement.metadata.document_category] : []);
  if (!configured.length) return 'Missing';
  const matching = configured.map((category: string) =>
    documents.find(document => document.category === category || document.name === category),
  );
  if (matching.every(Boolean) && matching.every(document => isApprovedDocument(document!))) return 'Complete';
  if (matching.some(Boolean)) return 'In Progress';
  return 'Missing';
};

const applicationStatus = (
  requirement: RoleRequirement,
  application?: OfficialApplicationData | null,
): RequirementProgress => {
  if (!application) return 'Missing';
  switch (requirement.requirementKey) {
    case 'official_application':
      return ['Submitted', 'Under Review', 'Approved'].includes(application.status) ? 'Complete' : 'In Progress';
    case 'employment_history': {
      const previous = application.employmentHistory.some(entry =>
        Boolean(entry.employerNameAddress?.trim() && entry.positionHeld?.trim()),
      );
      return application.recentEmployerNameAddress.trim() || previous ? 'Complete' : 'Missing';
    }
    case 'professional_references': {
      const minimum = Number(requirement.metadata?.minimum || 2);
      const complete = application.professionalReferences.filter(reference =>
        reference.fullName.trim() && reference.email.trim(),
      ).length;
      return complete >= minimum && application.refereesAgreedToContact ? 'Complete' : complete ? 'In Progress' : 'Missing';
    }
    case 'declaration_signature':
      return application.declarationConfirmed
        && application.referencesAndChecksAuthorised
        && application.satisfactoryChecksAcknowledged
        && application.dataProtectionConsent
        && Boolean(application.signatureValue.trim())
        ? 'Complete'
        : 'Missing';
    default: {
      const field = requirement.metadata?.form_field as keyof OfficialApplicationData | undefined;
      const fields = requirement.metadata?.form_fields as Array<keyof OfficialApplicationData> | undefined;
      if (field) return String(application[field] || '').trim() ? 'Complete' : 'Missing';
      if (fields?.length) return fields.every(key => String(application[key] || '').trim()) ? 'Complete' : 'Missing';
      return 'In Progress';
    }
  }
};

export const requirementProgress = (
  requirement: RoleRequirement,
  application: OfficialApplicationData | null | undefined,
  documents: Document[],
): RequirementProgress => {
  if (requirement.responsibleParty === 'administrator') {
    return 'Pending SHC Verification';
  }
  if (requirement.stage === 'application') return applicationStatus(requirement, application);
  return documentStatus(requirement, documents);
};

export const slugifyRole = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export const requirementDocumentCategories = (role?: RoleTemplate) => Array.from(new Set(
  activeRequirements(role)
    .filter(requirement => requirement.responsibleParty === 'applicant')
    .flatMap(requirement => requirement.metadata?.document_categories
      || (requirement.metadata?.document_category ? [requirement.metadata.document_category] : [])),
));
