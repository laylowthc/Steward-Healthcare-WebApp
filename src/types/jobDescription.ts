import { HrSignatureType } from './hrOnboarding';

export interface JobDescriptionContent {
  organisation: string;
  documentStatus: string;
  professionalRequirement: string;
  summary: string;
  reportsTo: string;
  duties: string[];
  conduct: string[];
  acknowledgementText: string;
}

export interface JobDescription {
  id: string;
  roleId: string;
  title: string;
  version: string;
  effectiveDate?: string;
  content: JobDescriptionContent;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobDescriptionAcknowledgement {
  id: string;
  jobDescriptionId: string;
  userId: string;
  applicantId: string;
  roleId: string;
  roleName: string;
  jdTitle: string;
  jdVersion: string;
  jdEffectiveDate?: string;
  contentSnapshot: JobDescriptionContent;
  acknowledgementText: string;
  acknowledgementVersion: string;
  signatureType: HrSignatureType;
  signatureValue: string;
  signerUserId: string;
  signerName: string;
  signedAt: string;
  createdAt: string;
}

export type JobDescriptionStatus =
  | 'Not Published'
  | 'Awaiting Signature'
  | 'Signed'
  | 'Re-sign Required';
