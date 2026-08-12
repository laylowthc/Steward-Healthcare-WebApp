export type HrOnboardingFormType =
  | 'starter_information'
  | 'bank_details'
  | 'paye_declaration'
  | 'next_of_kin'
  | 'working_time_declaration'
  | 'policy_acknowledgement';

export type HrOnboardingStatus =
  | 'Draft'
  | 'Submitted'
  | 'Returned for Correction'
  | 'Approved'
  | 'Rejected';

export type HrSignatureType = 'typed' | 'drawn';

export interface HrOnboardingForm {
  id?: string;
  userId: string;
  applicantId: string;
  roleId?: string;
  formType: HrOnboardingFormType;
  status: HrOnboardingStatus;
  formData: Record<string, any>;
  revision: number;
  signatureType?: HrSignatureType;
  signatureValue?: string;
  signerUserId?: string;
  signerName?: string;
  signedAt?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HrOnboardingFormVersion {
  id: string;
  formId: string;
  revision: number;
  status: 'Submitted';
  snapshot: Record<string, any>;
  signatureType?: HrSignatureType;
  signatureValue?: string;
  signerUserId?: string;
  signerName?: string;
  signedAt?: string;
  submittedAt: string;
  createdAt: string;
}

export interface HrPolicyDefinition {
  key: string;
  name: string;
  version: string;
  statement: string;
}

export interface HrFormDefinition {
  type: HrOnboardingFormType;
  title: string;
  description: string;
  signatureRequired: boolean;
  policies?: HrPolicyDefinition[];
}
