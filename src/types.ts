export type ApplicantStatus = 'Applied' | 'Screening' | 'Interview' | 'Compliance' | 'Active' | 'Rejected';

export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string; // Dynamic role target matching the templates
  status: ApplicantStatus;
  dateCreated: string;
  notes?: string;
  complianceChecked?: Record<string, 'Compliant' | 'Awaiting Review' | 'Missing'>; // Individual check marks for role's required docs
  interviewTime?: string;
  interviewMeetUrl?: string;
}

export type StaffRole = 'Nurse' | 'Care Assistant' | 'Senior Care Assistant' | 'Deputy Manager' | string;
export type ComplianceLevel = 'Compliant' | 'Expiring' | 'Non-Compliant';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: StaffRole;
  status: 'Active' | 'Non-Compliant';
  nmcPin?: string;
  nmcExpiry?: string;
  dbsStatus: ComplianceLevel | 'Pending';
  dbsNumber?: string;
  dbsExpiry?: string;
  rightToWork: ComplianceLevel;
  rightToWorkExpiry?: string;
  trainingStatus: ComplianceLevel;
  trainingExpiry?: string;
  joinedDate: string;
}

export type DocumentCategory = 
  | 'Passport'
  | 'DBS'
  | 'Right To Work'
  | 'Driving Licence'
  | 'Utility Bill'
  | 'CV'
  | 'Employment Contract'
  | 'Training Certificates'
  | 'References'
  | 'Job Description'
  | 'Privacy Policy'
  | 'Staff Handbook';

export type DocumentStatus = 'Awaiting Review' | 'Approved' | 'Expired' | 'Pending Signature' | 'Signed';

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  staffId?: string;
  staffName?: string;
  fileUrl?: string;
  uploadDate: string;
  expiryDate?: string;
  status: DocumentStatus;
  size?: string;
  assignedByAdmin?: boolean;
  filledData?: Record<string, any>;
}

export interface Timesheet {
  id: string;
  staffName: string;
  role: StaffRole;
  weekEnding: string;
  uploadDate: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  hoursWorked: number;
  fileUrl: string;
}

export interface RoleTemplate {
  role: StaffRole;
  salaryRange: string;
  description: string;
  responsibilities: string[];
  requiredCredentials: string[];
}

export interface FamilyFeedback {
  id: string;
  clientName: string;
  familyRepresentative: string;
  relation: string; // e.g. Son, Daughter, Spouse, Guardian
  caregiverAssigned: string; // Target caregiver
  ratingCareQuality: number; // 1-5 scale
  ratingCommunication: number; // 1-5 scale
  ratingPunctuality: number; // 1-5 scale
  feedbackComments: string;
  anonymous: boolean;
  dateSubmitted: string;
  status: 'Awaiting Action' | 'Reviewed' | 'Resolved';
  category: 'Compliment' | 'Suggestion' | 'Concern' | 'General Inquiry';
  hasContactRequest: boolean;
  contactEmailOrPhone?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  type: 'applicant' | 'document' | 'compliance' | 'timesheet' | 'status';
}
