export type OfficialApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Returned for Correction'
  | 'Approved'
  | 'Rejected';

export type ChronologyEntryType =
  | 'secondary_education'
  | 'higher_education'
  | 'vocational_training'
  | 'employment'
  | 'unemployment'
  | 'caring_responsibilities'
  | 'parental_leave'
  | 'illness'
  | 'travel'
  | 'career_break'
  | 'other';

export interface ChronologyEntry {
  id: string;
  type: ChronologyEntryType;
  organisation: string;
  title: string;
  startMonth: string;
  endMonth: string;
  isCurrent: boolean;
  location: string;
  details: string;
  reasonForLeaving: string;
  // Retained when a legacy employer record is normalized on its next edit.
  legacyPostcode?: string;
  legacyTelephone?: string;
}

export interface ProfessionalReference {
  fullName: string;
  position: string;
  organisation: string;
  relationshipToApplicant: string;
  telephone: string;
  email: string;
}

export interface OfficialApplicationData {
  id?: string;
  userId: string;
  applicantId: string;
  roleId?: string;
  positionApplied: string;
  vacancyReferenceLocation: string;
  sourceOfAdvertisement: string;
  title: string;
  forenames: string;
  surname: string;
  address: string;
  postcode: string;
  telephone: string;
  mobile: string;
  personalEmail: string;
  nationalInsuranceNumber: string;
  eligibleToWorkUk: boolean | null;
  nmcPin: string;
  rna: string;
  nmcExpiryDate: string;
  rightToWork: string;
  enhancedDbs: string;
  dbsIssueDate: string;
  recentEmployerNameAddress: string;
  recentEmployerPostcode: string;
  recentEmployerTelephone: string;
  recentEmployerDateFrom: string;
  recentEmployerDateTo: string;
  recentEmployerPositionTitle: string;
  recentEmployerPrimaryResponsibilities: string;
  recentEmployerSalary: string;
  recentEmployerNoticePeriod: string;
  recentEmployerReasonForLeaving: string;
  employmentHistory: ChronologyEntry[];
  professionalReferences: ProfessionalReference[];
  refereesAgreedToContact: boolean;
  personalStatement: string;
  knowsConnectedPerson: boolean | null;
  connectedPersonDetails: string;
  hasUnprotectedCriminalRecord: boolean | null;
  criminalRecordDetails: string;
  declarationConfirmed: boolean;
  referencesAndChecksAuthorised: boolean;
  satisfactoryChecksAcknowledged: boolean;
  dataProtectionConsent: boolean;
  signatureType: 'typed' | 'drawn';
  signatureValue: string;
  printedName: string;
  signatureDate: string;
  currentStep: number;
  status: OfficialApplicationStatus;
  revision: number;
  reviewerNotes?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EqualOpportunitiesData {
  vacancyReferenceNumber: string;
  genderIdentification: string;
  ageBand: string;
  disabilityDeclaration: string;
  ethnicOrigin: string;
}

export interface OfficialApplicationVersion {
  id: string;
  applicationId: string;
  revision: number;
  status: OfficialApplicationStatus;
  snapshot: OfficialApplicationData;
  createdAt: string;
  createdBy?: string;
}

export const emptyChronologyEntry = (
  type: ChronologyEntryType = 'employment',
): ChronologyEntry => ({
  id: globalThis.crypto?.randomUUID?.() || `history-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type,
  organisation: '',
  title: '',
  startMonth: '',
  endMonth: '',
  isCurrent: false,
  location: '',
  details: '',
  reasonForLeaving: '',
});

export const emptyReference = (): ProfessionalReference => ({
  fullName: '', position: '', organisation: '', relationshipToApplicant: '', telephone: '', email: ''
});
