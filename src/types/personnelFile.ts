import { ResponsibleParty } from '../types';

export type PersonnelFileCategory =
  | 'Recruitment'
  | 'Identity / Pre-employment'
  | 'HR Onboarding'
  | 'Employment Documents'
  | 'Ongoing Staff Record';

export type PersonnelFileStatus =
  | 'Complete'
  | 'Outstanding'
  | 'In Progress'
  | 'Awaiting Applicant'
  | 'Awaiting SHC Review'
  | 'Returned for Correction'
  | 'Verification Required'
  | 'Expiring'
  | 'Expired'
  | 'Concern / Review Required'
  | 'Not Recorded'
  | 'Not Required'
  | 'Not Applicable'
  | 'Exception Approved';

export type PersonnelSourceRoute = 'application' | 'recruitment' | 'compliance' | 'hr_onboarding' | 'job_description' | 'documents';

export interface PersonnelFileSource {
  workflow: string;
  recordId?: string;
  evidenceId?: string;
  route: PersonnelSourceRoute;
  timestamp?: string;
  reviewerId?: string;
}

export interface PersonnelChecklistItem {
  key: string;
  displayName: string;
  category: PersonnelFileCategory;
  status: PersonnelFileStatus;
  reason: string;
  blocking: boolean;
  responsibleParty: ResponsibleParty;
  derivation: 'auto-derived' | 'admin-recorded' | 'future-workflow';
  source: PersonnelFileSource;
}

export interface PersonnelCategorySummary {
  category: PersonnelFileCategory;
  required: number;
  complete: number;
  outstanding: number;
  notApplicable: number;
}

export interface PersonnelFileSummary {
  required: number;
  complete: number;
  outstanding: number;
  awaitingVerification: number;
  percentage: number;
  categories: PersonnelCategorySummary[];
  blockers: PersonnelChecklistItem[];
}
