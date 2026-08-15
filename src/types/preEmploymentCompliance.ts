export type ComplianceRequirementStatus =
  | 'Not Required'
  | 'Not Started'
  | 'Awaiting Applicant'
  | 'Evidence Received'
  | 'Awaiting Review'
  | 'Verification In Progress'
  | 'Verified'
  | 'Concern / Review Required'
  | 'Expiring'
  | 'Expired'
  | 'Failed / Unsatisfactory'
  | 'Waived / Exception Approved';

export type ComplianceSourceKind =
  | 'derived'
  | 'document'
  | 'office_verification'
  | 'professional_registration'
  | 'manager_clearance';

export interface ComplianceCase {
  id: string;
  userId: string;
  applicantId?: string;
  staffProfileId?: string;
  roleId: string;
  lifecycleState: string;
  overallStatus: 'Not Started' | 'In Progress' | 'Review Required' | 'Satisfied';
  managerClearanceStatus: 'Pending' | 'On Hold' | 'Cleared' | 'Not Cleared';
  deploymentEligible: boolean;
  managerClearedBy?: string;
  managerClearedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRecord {
  id: string;
  complianceCaseId: string;
  roleRequirementId?: string;
  requirementKey: string;
  displayName: string;
  stage: 'application' | 'onboarding' | 'deployment';
  responsibleParty: 'applicant' | 'administrator';
  sourceKind: ComplianceSourceKind;
  status: ComplianceRequirementStatus;
  evidenceDocumentId?: string;
  evidenceReceivedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  expiryDate?: string;
  blocking: boolean;
  applicantMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceVerificationDetails {
  complianceRecordId: string;
  evidenceType: string;
  evidenceReference: string;
  checkPerformed: boolean;
  checkDate?: string;
  outcome: string;
  concernPresent: boolean;
  riskAssessmentStatus?: 'Not Required' | 'Required' | 'In Progress' | 'Suitable' | 'Unsuitable';
  occupationalHealthStatus?: 'Declaration Received' | 'Referral Required' | 'Clearance Pending' | 'Cleared' | 'Restrictions / Adjustments Recorded';
  shareCodeReference: string;
  certificateNumber: string;
  issueDate?: string;
  registrationBody: string;
  registrationType: string;
  internalNotes: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ReferenceVerification {
  id?: string;
  complianceCaseId: string;
  referenceNumber: 1 | 2;
  applicationReferenceIndex?: number;
  refereeNameSnapshot: string;
  refereeOrganisationSnapshot: string;
  requestedAt?: string;
  receivedAt?: string;
  employmentDatesConfirmed: boolean;
  reasonForLeavingConfirmed: boolean;
  signerName: string;
  signerRole: string;
  telephoneVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  outcome: 'Pending' | 'Satisfactory' | 'Concern Identified' | 'Unsatisfactory';
  supportingDocumentId?: string;
  internalNotes: string;
}

export interface ComplianceEvent {
  id: string;
  complianceCaseId: string;
  complianceRecordId?: string;
  actorUserId?: string;
  action: string;
  previousState?: string;
  newState?: string;
  reason: string;
  createdAt: string;
}

export interface ComplianceCaseBundle {
  complianceCase: ComplianceCase | null;
  records: ComplianceRecord[];
  details: ComplianceVerificationDetails[];
  references: ReferenceVerification[];
  events: ComplianceEvent[];
  schemaAvailable: boolean;
}
