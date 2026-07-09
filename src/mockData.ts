import { Applicant, Staff, Document, Timesheet, RoleTemplate, ActivityLog, FamilyFeedback } from './types';

export const initialApplicants: Applicant[] = [];
export const initialStaff: Staff[] = [];
export const initialDocuments: Document[] = [];
export const initialTimesheets: Timesheet[] = [];
export const initialActivityLogs: ActivityLog[] = [];
export const initialRoleTemplates: RoleTemplate[] = [
  {
    role: 'Nurse',
    salaryRange: '£25.00 - £35.00 / hr',
    description: 'Provide nursing care',
    responsibilities: ['Patient care'],
    requiredCredentials: ['DBS Certificate', 'NMC Pin', 'Right to Work', 'Reference 1', 'Reference 2']
  },
  {
    role: 'Care Assistant',
    salaryRange: '£12.00 - £18.00 / hr',
    description: 'Provide assistance',
    responsibilities: ['Daily care routines'],
    requiredCredentials: ['DBS Certificate', 'Right to Work', 'Reference 1']
  }
];

export const initialFamilyFeedbacks: FamilyFeedback[] = [];
