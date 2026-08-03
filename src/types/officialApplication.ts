export type OfficialApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Returned for Correction'
  | 'Approved'
  | 'Rejected';

export interface EmployerRecord {
  employerNameAddress: string;
  postcode: string;
  telephone: string;
  dateFrom: string;
  dateTo: string;
  positionHeld: string;
  reasonForLeaving: string;
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
  employmentHistory: EmployerRecord[];
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

export const emptyEmployer = (): EmployerRecord => ({
  employerNameAddress: '', postcode: '', telephone: '', dateFrom: '', dateTo: '', positionHeld: '', reasonForLeaving: ''
});

export const emptyReference = (): ProfessionalReference => ({
  fullName: '', position: '', organisation: '', relationshipToApplicant: '', telephone: '', email: ''
});
