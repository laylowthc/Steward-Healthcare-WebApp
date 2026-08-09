import {
  AccountStatus,
  ComplianceLevel,
  Document,
  RosterStatus,
  Staff
} from '../types';
import { getSignedUrlForDocument } from './supabase';

const APPROVED_DOCUMENT_STATUSES = new Set(['Approved', 'Signed', 'Completed']);
const EXPIRING_WINDOW_MS = 35 * 24 * 60 * 60 * 1000;

export interface SubjectIds {
  userId?: string;
  applicantId?: string;
  staffProfileId?: string;
}

export const getSubjectDocuments = (documents: Document[], ids: SubjectIds) => {
  const identifiers = new Set(
    [ids.userId, ids.applicantId, ids.staffProfileId].filter(Boolean) as string[]
  );

  return documents.filter(document =>
    [document.userId, document.applicantId, document.staffProfileId, document.staffId]
      .some(identifier => identifier && identifiers.has(identifier))
  );
};

const categoryMatches = (category: string, terms: string[]) => {
  const normalized = category.trim().toLowerCase();
  return terms.some(term => normalized.includes(term));
};

const newestFirst = (left: Document, right: Document) =>
  new Date(right.uploadDate).getTime() - new Date(left.uploadDate).getTime();

export const resolvePreferredAvatarUrl = (documentUrl?: string, legacyUrl?: string) =>
  documentUrl || legacyUrl || undefined;

export const resolveDisplayAvatarUrl = async (avatarUrl?: string) => {
  if (!avatarUrl) return undefined;
  return (await getSignedUrlForDocument(avatarUrl)) || undefined;
};

export const resolveAvatarUrl = (
  documents: Document[],
  ids: SubjectIds,
  legacyUrl?: string
) => {
  const photo = getSubjectDocuments(documents, ids)
    .filter(document => categoryMatches(document.category, ['profile photo', 'passport headshot']))
    .sort(newestFirst)
    .find(document => Boolean(document.fileUrl));

  return resolvePreferredAvatarUrl(photo?.fileUrl, legacyUrl);
};

const documentCompliance = (documents: Document[], terms: string[]): ComplianceLevel | 'Pending' => {
  const matches = documents.filter(document => categoryMatches(document.category, terms));
  if (matches.length === 0) return 'Pending';

  const approved = matches.filter(document => APPROVED_DOCUMENT_STATUSES.has(document.status));
  if (approved.length === 0) return 'Pending';

  const expiryDates = approved
    .map(document => document.expiryDate)
    .filter(Boolean)
    .map(value => new Date(value as string).getTime())
    .filter(Number.isFinite);

  if (expiryDates.some(expiry => expiry < Date.now())) return 'Non-Compliant';
  if (expiryDates.some(expiry => expiry - Date.now() <= EXPIRING_WINDOW_MS)) return 'Expiring';
  return 'Compliant';
};

export const deriveRequirementStatus = (
  documents: Document[],
  requirement: string
): 'Compliant' | 'Awaiting Review' | 'Missing' => {
  const requirementCategory = requirement.trim().toLowerCase();
  const matches = documents.filter(document => {
    const category = document.category.trim().toLowerCase();
    return category.includes(requirementCategory) || requirementCategory.includes(category) ||
      (requirementCategory.includes('dbs') && category.includes('dbs')) ||
      (requirementCategory.includes('right to work') && category.includes('right to work')) ||
      (requirementCategory.includes('reference') && category.includes('reference')) ||
      (requirementCategory.includes('training') && category.includes('training')) ||
      (requirementCategory.includes('passport') && category.includes('passport'));
  });

  if (matches.length === 0) return 'Missing';
  return matches.some(document => APPROVED_DOCUMENT_STATUSES.has(document.status))
    ? 'Compliant'
    : 'Awaiting Review';
};

export const deriveCompliance = (documents: Document[], ids: SubjectIds) => {
  const subjectDocuments = getSubjectDocuments(documents, ids);
  const references = subjectDocuments.filter(document =>
    categoryMatches(document.category, ['reference']) && APPROVED_DOCUMENT_STATUSES.has(document.status)
  );

  return {
    dbsStatus: documentCompliance(subjectDocuments, ['dbs']),
    rightToWork: documentCompliance(subjectDocuments, ['right to work', 'right to work proof']),
    trainingStatus: documentCompliance(subjectDocuments, ['training']),
    referenceStatus: references.length >= 2 ? 'Compliant' as const : references.length > 0 ? 'Pending' as const : 'Pending' as const
  };
};

export const deriveRosterStatus = (input: {
  accountStatus?: AccountStatus;
  employmentStatus: Staff['status'];
  hasAvatar: boolean;
  dbsStatus: ComplianceLevel | 'Pending';
  rightToWork: ComplianceLevel | 'Pending';
  trainingStatus: ComplianceLevel | 'Pending';
  referenceStatus: ComplianceLevel | 'Pending';
}): RosterStatus => {
  if (input.accountStatus === 'Suspended' || input.employmentStatus === 'Suspended') return 'Suspended';
  if (input.accountStatus === 'Pending') return 'Pending';

  const compliance = [input.dbsStatus, input.rightToWork, input.trainingStatus, input.referenceStatus];
  if (compliance.includes('Non-Compliant') || compliance.includes('Expiring')) return 'Active';
  if (!input.hasAvatar || compliance.includes('Pending')) return 'Pending';
  return 'Deployable';
};

export const enrichStaffFromRecords = (staff: Staff, documents: Document[]): Staff => {
  const ids = { userId: staff.userId, applicantId: staff.applicantId, staffProfileId: staff.id };
  const compliance = deriveCompliance(documents, ids);
  const avatarUrl = resolveAvatarUrl(documents, ids, staff.avatarUrl);

  return {
    ...staff,
    ...compliance,
    avatarUrl,
    rosterStatus: deriveRosterStatus({
      accountStatus: staff.accountStatus,
      employmentStatus: staff.status,
      hasAvatar: Boolean(avatarUrl),
      ...compliance
    })
  };
};
