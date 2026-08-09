export type ApplicantStatus = 'Applied' | 'Screening' | 'Interview' | 'Compliance' | 'Accepted' | 'Rejected';
export type AccountStatus = 'Pending' | 'Active' | 'Suspended';

export interface CVData {
  personalDetails: { address: string; dob: string; nationality: string; avatarUrl?: string };
  employmentHistory: Array<{ company: string; role: string; startDate: string; endDate: string; duties: string }>;
  qualifications: Array<{ institution: string; degree: string; year: string }>;
  mandatoryTraining: string[];
  skills: string[];
  references: Array<{ name: string; contact: string; relation: string }>;
}

export interface Applicant {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  position: string; // Dynamic role target matching the templates
  status: ApplicantStatus;
  dateCreated: string;
  notes?: string;
  interviewTime?: string;
  interviewMeetUrl?: string;
  cvData?: CVData;
}

export type StaffRole = 'Nurse' | 'Care Assistant' | 'Senior Care Assistant' | 'Deputy Manager' | string;
export type ComplianceLevel = 'Compliant' | 'Expiring' | 'Non-Compliant';
export type RosterStatus = 'Active' | 'Suspended' | 'Deployable' | 'Pending';

export interface Staff {
  id: string;
  userId?: string;
  applicantId?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: StaffRole;
  status: 'Active' | 'Non-Compliant' | 'Suspended';
  accountStatus?: AccountStatus;
  rosterStatus: RosterStatus;
  nmcPin?: string;
  nmcExpiry?: string;
  dbsStatus: ComplianceLevel | 'Pending';
  dbsNumber?: string;
  dbsExpiry?: string;
  rightToWork: ComplianceLevel | 'Pending';
  rightToWorkExpiry?: string;
  trainingStatus: ComplianceLevel | 'Pending';
  referenceStatus: ComplianceLevel | 'Pending';
  trainingExpiry?: string;
  joinedDate: string;
  avatarUrl?: string;
}

export interface SystemUserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'admin' | 'staff' | 'family' | 'applicant';
  status: AccountStatus;
  permissions: string[];
}

export type DocumentCategory = 
  | 'Profile Photo'
  | 'Passport'
  | 'Right To Work'
  | 'DBS Certificate'
  | 'Driving Licence'
  | 'CV'
  | 'Employment Contract'
  | 'Job Description'
  | 'Nurse Profile'
  | 'Care Worker Profile'
  | 'Training Certificate'
  | 'Reference'
  | 'Timesheet'
  | 'Application Form'
  | 'New Starter Form'
  | 'Other';

export type DocumentStatus = 'Awaiting Review' | 'Approved' | 'Expired' | 'Pending Signature' | 'Signed' | 'Sent' | 'Opened' | 'Completed' | 'Declined';

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  staffId?: string;
  userId?: string;
  applicantId?: string;
  staffProfileId?: string;
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
  client?: string;
  uploadDate: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  hoursWorked: number;
  fileUrl: string;
  reviewer?: string;
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

export const mapCredentialToCategory = (cred: string): DocumentCategory => {
  const norm = cred.trim().toLowerCase();
  if (norm.includes('profile photo') || norm.includes('passport headshot')) return 'Profile Photo';
  if (norm.includes('dbs')) return 'DBS Certificate';
  if (norm.includes('right to work')) return 'Right To Work';
  if (norm.includes('reference 1') || norm.includes('reference 2') || norm.includes('reference')) return 'Reference';
  if (norm.includes('nmc pin') || norm.includes('nmc') || norm.includes('nurse')) return 'Nurse Profile';
  if (norm.includes('care assistant') || norm.includes('care worker') || norm.includes('caregiver') || norm.includes('carer')) return 'Care Worker Profile';
  if (norm.includes('cv') || norm.includes('resume')) return 'CV';
  if (norm.includes('passport')) return 'Passport';
  if (norm.includes('driving')) return 'Driving Licence';
  if (norm.includes('contract')) return 'Employment Contract';
  if (norm.includes('training') || norm.includes('certificate')) return 'Training Certificate';
  if (norm.includes('job description') || norm.includes('associated duties')) return 'Job Description';
  if (norm.includes('timesheet')) return 'Timesheet';
  
  return 'Other';
};
