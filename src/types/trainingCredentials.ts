import { RoleRequirement } from '../types';

export type TrainingCredentialStatus =
  | 'Not Recorded'
  | 'Awaiting Verification'
  | 'Valid'
  | 'Expiring Soon'
  | 'Expired'
  | 'Not Required';

export type TrainingVerificationStatus = 'Awaiting Verification' | 'Verified';

export interface StaffTrainingRecord {
  id?: string;
  userId: string;
  staffProfileId: string;
  roleRequirementId: string;
  provider: string;
  issueDate?: string;
  expiryDate?: string;
  evidenceDocumentId?: string;
  verificationStatus: TrainingVerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingCredentialItem {
  requirement: RoleRequirement;
  record?: StaffTrainingRecord;
  status: TrainingCredentialStatus;
  mandatory: boolean;
  evidenceRequired: boolean;
  expiryApplicable: boolean;
  deploymentBlocking: boolean;
  source: 'training_record' | 'existing_compliance';
  reason: string;
}
