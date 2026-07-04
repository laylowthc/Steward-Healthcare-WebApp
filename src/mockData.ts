import { Applicant, Staff, Document, Timesheet, RoleTemplate, ActivityLog, FamilyFeedback } from './types';

export const initialApplicants: Applicant[] = [];
export const initialStaff: Staff[] = [
  {
    id: 'staff_1',
    name: 'Blessing Gurure',
    email: 'blessing.gurure@shc247.co.uk',
    phone: '+44 7700 900247',
    address: '24 Steward House, Birmingham, B1 1AA',
    role: 'Nurse',
    status: 'Active',
    nmcPin: '12A3456E',
    nmcExpiry: '2027-07-31',
    dbsStatus: 'Compliant',
    dbsNumber: '00148273920',
    dbsExpiry: '2028-03-15',
    rightToWork: 'Compliant',
    rightToWorkExpiry: '2029-01-10',
    trainingStatus: 'Compliant',
    trainingExpiry: '2026-12-20',
    joinedDate: '2024-08-12'
  }
];
export const initialDocuments: Document[] = [
  {
    id: 'doc_demo_dbs',
    name: 'Blessing Gurure Enhanced DBS Certificate',
    category: 'DBS',
    staffId: 'staff_1',
    staffName: 'Blessing Gurure',
    uploadDate: '2026-06-14',
    expiryDate: '2028-03-15',
    status: 'Approved',
    size: '420 KB'
  },
  {
    id: 'doc_demo_training',
    name: 'Mandatory Training Certificate 2026',
    category: 'Training Certificates',
    staffId: 'staff_1',
    staffName: 'Blessing Gurure',
    uploadDate: '2026-05-22',
    expiryDate: '2026-12-20',
    status: 'Approved',
    size: '318 KB'
  }
];
export const initialTimesheets: Timesheet[] = [
  {
    id: 'ts_demo_1',
    staffName: 'Blessing Gurure',
    role: 'Nurse',
    weekEnding: '2026-07-03',
    client: 'Royal Care Home',
    uploadDate: '2026-07-04',
    approvalStatus: 'Pending',
    hoursWorked: 36,
    fileUrl: 'Demo timesheet uploaded'
  }
];
export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'act_demo_1',
    action: 'STAFFING: Blessing Gurure is ready for deployment with compliant DBS, right to work, and training records.',
    timestamp: 'Demo seed',
    user: 'System Bot',
    type: 'status'
  }
];
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
