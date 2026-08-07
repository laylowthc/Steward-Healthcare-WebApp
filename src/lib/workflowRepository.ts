import { supabase } from './supabase';
import {
  AccountStatus,
  ActivityLog,
  Applicant,
  ApplicantStatus,
  ComplianceLevel,
  Document,
  DocumentCategory,
  DocumentStatus,
  FamilyFeedback,
  RoleTemplate,
  Staff,
  StaffRole,
  SystemUserProfile,
  Timesheet
} from '../types';
import { enrichStaffFromRecords, resolveDisplayAvatarUrl, resolvePreferredAvatarUrl } from './profileState';

type AppRole = 'admin' | 'staff' | 'family' | 'applicant';

const toRole = (role?: string): AppRole => {
  const normalized = (role || 'Applicant').toLowerCase();
  if (normalized === 'admin' || normalized === 'staff' || normalized === 'family') return normalized;
  return 'applicant';
};

const toDbRole = (role: AppRole) => {
  if (role === 'admin') return 'Admin';
  if (role === 'staff') return 'Staff';
  if (role === 'family') return 'Family';
  return 'Applicant';
};

const toAccountStatus = (status?: string): AccountStatus => {
  if (status === 'Active' || status === 'Suspended') return status;
  return 'Pending';
};

export const mapUserRow = (row: any): SystemUserProfile => ({
  id: row.id,
  email: (row.email || '').toLowerCase(),
  fullName: row.full_name || row.email || 'User',
  phone: row.phone || '',
  role: toRole(row.role),
  status: toAccountStatus(row.status),
  permissions: row.permissions || []
});

export const mapApplicantRow = (row: any): Applicant => ({
  id: row.id,
  userId: row.user_id || undefined,
  name: row.full_name || row.email || 'Applicant',
  email: (row.email || '').toLowerCase(),
  phone: row.phone || '',
  position: row.position || 'Care Assistant',
  status: (row.status || 'Applied') as ApplicantStatus,
  dateCreated: (row.created_at || new Date().toISOString()).split('T')[0],
  notes: row.notes || undefined,
  interviewTime: row.interview_time || undefined,
  interviewMeetUrl: row.interview_meet_url || undefined,
  cvData: row.cv_data || undefined
});

export const applicantToRow = (applicant: Omit<Applicant, 'id' | 'dateCreated'> & { id?: string; userId?: string }) => ({
  ...(applicant.id ? { id: applicant.id } : {}),
  user_id: applicant.userId || applicant.id || null,
  full_name: applicant.name,
  email: applicant.email.toLowerCase(),
  phone: applicant.phone || '',
  position: applicant.position || 'Care Assistant',
  status: applicant.status || 'Applied',
  notes: applicant.notes || null,
  interview_time: applicant.interviewTime || null,
  interview_meet_url: applicant.interviewMeetUrl || null,
  cv_data: applicant.cvData || null,
  updated_at: new Date().toISOString()
});

export const getAvatarUrlFromStaffNumber = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim().startsWith('{')) return undefined;

  try {
    const metadata = JSON.parse(value);
    return typeof metadata?.avatarUrl === 'string' && metadata.avatarUrl.trim()
      ? metadata.avatarUrl
      : undefined;
  } catch {
    return undefined;
  }
};

export const mapStaffRow = (row: any): Staff => {
  const user = Array.isArray(row.user) ? row.user[0] : row.user;
  const profileRole = row.job_title || row.role;
  const resolvedRole = profileRole && profileRole !== 'Staff'
    ? profileRole
    : user?.role && user.role !== 'Staff'
      ? user.role
      : 'Role not assigned';

  return {
    id: row.id,
    userId: row.user_id || undefined,
    applicantId: row.applicant_id || undefined,
    name: user?.full_name || row.full_name || user?.email || row.email || 'Unnamed staff profile',
    email: (user?.email || row.email || '').toLowerCase(),
    phone: row.phone || user?.phone || '',
    address: row.address || '',
    role: resolvedRole as StaffRole,
    status: row.employment_status || 'Active',
    accountStatus: toAccountStatus(user?.status),
    rosterStatus: 'Pending',
    nmcPin: row.nmc_pin || undefined,
    nmcExpiry: row.nmc_expiry || undefined,
    dbsStatus: (row.dbs_status || 'Pending') as ComplianceLevel | 'Pending',
    dbsNumber: row.dbs_number || undefined,
    dbsExpiry: row.dbs_expiry || undefined,
    rightToWork: (row.right_to_work || 'Non-Compliant') as ComplianceLevel,
    rightToWorkExpiry: row.right_to_work_expiry || undefined,
    trainingStatus: (row.training_status || 'Non-Compliant') as ComplianceLevel,
    referenceStatus: 'Pending',
    trainingExpiry: row.training_expiry || undefined,
    joinedDate: row.joined_date || (row.created_at || new Date().toISOString()).split('T')[0],
    avatarUrl: getAvatarUrlFromStaffNumber(row.staff_number)
  };
};

export const mapDocumentRow = (row: any): Document => ({
  id: String(row.id),
  name: row.document_name,
  category: row.category as DocumentCategory,
  userId: row.user_id || undefined,
  applicantId: row.applicant_id || undefined,
  staffProfileId: row.staff_profile_id || undefined,
  staffId: row.staff_profile_id || row.applicant_id || row.user_id || undefined,
  fileUrl: row.file_path || undefined,
  uploadDate: row.upload_date || new Date().toISOString().split('T')[0],
  expiryDate: row.expiry_date || undefined,
  status: (row.verification_status === 'Pending' ? 'Awaiting Review' : row.verification_status) as DocumentStatus
});

const resolveProfilePhotoUrls = async (documents: Document[]) => Promise.all(documents.map(async document => {
  if (document.category !== 'Profile Photo' || !document.fileUrl || /^https?:\/\//i.test(document.fileUrl)) {
    return document;
  }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(document.fileUrl, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error('Failed to resolve profile photo:', error);
    return { ...document, fileUrl: undefined };
  }

  return { ...document, fileUrl: data.signedUrl };
}));

export const staffToRow = (staff: Staff & { userId?: string; applicantId?: string }) => ({
  user_id: staff.userId || null,
  applicant_id: staff.applicantId || null,
  full_name: staff.name,
  email: staff.email.toLowerCase(),
  phone: staff.phone || '',
  address: staff.address || '',
  role: staff.role || 'Care Assistant',
  employment_status: staff.status,
  nmc_pin: staff.nmcPin || null,
  nmc_expiry: staff.nmcExpiry || null,
  dbs_number: staff.dbsNumber || null,
  dbs_expiry: staff.dbsExpiry || null,
  right_to_work_expiry: staff.rightToWorkExpiry || null,
  training_expiry: staff.trainingExpiry || null,
  joined_date: staff.joinedDate || new Date().toISOString().split('T')[0],
  updated_at: new Date().toISOString()
});

export const mapTimesheetRow = (row: any): Timesheet => ({
  id: row.id,
  staffName: row.staff_name,
  role: (row.role || 'Care Assistant') as StaffRole,
  weekEnding: row.week_ending,
  client: row.client || undefined,
  uploadDate: row.upload_date || (row.created_at || new Date().toISOString()).split('T')[0],
  approvalStatus: row.approval_status || 'Pending',
  hoursWorked: Number(row.hours_worked || 0),
  fileUrl: row.file_url || '',
  reviewer: row.reviewer || undefined
});

export const timesheetToRow = (timesheet: Omit<Timesheet, 'id' | 'uploadDate'> & { id?: string; userId?: string; staffProfileId?: string }) => ({
  ...(timesheet.id ? { id: timesheet.id } : {}),
  user_id: timesheet.userId || null,
  staff_profile_id: timesheet.staffProfileId || null,
  staff_name: timesheet.staffName,
  role: timesheet.role,
  week_ending: timesheet.weekEnding,
  client: timesheet.client || null,
  approval_status: timesheet.approvalStatus,
  hours_worked: timesheet.hoursWorked,
  file_url: timesheet.fileUrl || null,
  reviewer: timesheet.reviewer || null,
  updated_at: new Date().toISOString()
});

export const mapTemplateRow = (row: any): RoleTemplate => ({
  role: row.role,
  salaryRange: row.salary_range || '',
  description: row.description || '',
  responsibilities: row.responsibilities || [],
  requiredCredentials: row.required_credentials || []
});

export const templateToRow = (template: RoleTemplate) => ({
  role: template.role,
  salary_range: template.salaryRange,
  description: template.description,
  responsibilities: template.responsibilities,
  required_credentials: template.requiredCredentials,
  updated_at: new Date().toISOString()
});

export const mapLogRow = (row: any): ActivityLog => ({
  id: row.id,
  action: row.action,
  timestamp: row.created_at ? new Date(row.created_at).toLocaleString() : 'Just now',
  user: row.actor_name || 'System',
  type: row.type || 'status'
});

export const mapFeedbackRow = (row: any): FamilyFeedback => ({
  id: row.id,
  clientName: row.client_name,
  familyRepresentative: row.family_representative || '',
  relation: row.relation || '',
  caregiverAssigned: row.caregiver_assigned || '',
  ratingCareQuality: row.rating_care_quality || 0,
  ratingCommunication: row.rating_communication || 0,
  ratingPunctuality: row.rating_punctuality || 0,
  feedbackComments: row.feedback_comments || '',
  anonymous: Boolean(row.anonymous),
  dateSubmitted: row.date_submitted || new Date().toISOString(),
  status: row.status || 'Awaiting Action',
  category: row.category || 'General Inquiry',
  hasContactRequest: Boolean(row.has_contact_request),
  contactEmailOrPhone: row.contact_email_or_phone || undefined
});

export async function getCurrentProfile(authUserId: string, email: string) {
  const userEmail = email.toLowerCase();
  const { data: byId, error: byIdError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .maybeSingle();

  if (byIdError) throw byIdError;
  if (byId) return mapUserRow(byId);

  const { data: byEmail, error: byEmailError } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle();

  if (byEmailError) throw byEmailError;
  if (!byEmail) return null;

  return mapUserRow(byEmail);
}

export async function createUserProfile(input: {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  status?: AccountStatus;
}) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: input.id,
      firebase_uid: input.id,
      email: input.email.toLowerCase(),
      full_name: input.fullName,
      role: toDbRole(input.role),
      status: input.status || 'Pending',
      permissions: []
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapUserRow(data);
}

export async function loadWorkflowData(profile: SystemUserProfile) {
  const isAdmin = profile.role === 'admin';

  const applicantQuery = isAdmin
    ? supabase.from('applicants').select('*').order('created_at', { ascending: false })
    : supabase.from('applicants').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });

  const staffSelect = `
    *,
    user:users!staff_profiles_user_id_fkey (
      full_name,
      email,
      phone,
      role,
      status
    )
  `;
  const staffQuery = isAdmin
    ? supabase.from('staff_profiles').select(staffSelect).order('created_at', { ascending: false })
    : supabase.from('staff_profiles').select(staffSelect).eq('user_id', profile.id).order('created_at', { ascending: false });

  const timesheetQuery = isAdmin
    ? supabase.from('timesheets').select('*').order('created_at', { ascending: false })
    : supabase.from('timesheets').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });

  const documentQuery = isAdmin
    ? supabase.from('documents').select('*').order('upload_date', { ascending: false })
    : supabase.from('documents').select('*').eq('user_id', profile.id).order('upload_date', { ascending: false });

  const [applicantResult, staffResult, documentResult, timesheetResult, templateResult, logResult, feedbackResult] = await Promise.all([
    applicantQuery,
    staffQuery,
    documentQuery,
    timesheetQuery,
    supabase.from('role_templates').select('*').order('role'),
    isAdmin
      ? supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100)
      : supabase.from('activity_logs').select('*').eq('actor_user_id', profile.id).order('created_at', { ascending: false }).limit(100),
    isAdmin
      ? supabase.from('family_feedback').select('*').order('date_submitted', { ascending: false })
      : Promise.resolve({ data: [], error: null } as any)
  ]);

  const firstError = applicantResult.error || staffResult.error || documentResult.error || timesheetResult.error || templateResult.error || logResult.error || feedbackResult.error;
  if (firstError) throw firstError;

  const documents = await resolveProfilePhotoUrls((documentResult.data || []).map(mapDocumentRow));
  const applicants = (applicantResult.data || []).map(mapApplicantRow);
  const applicantAvatarById = new Map(
    applicants.map(applicant => [applicant.id, applicant.cvData?.personalDetails?.avatarUrl] as const)
  );
  const enrichedStaff = (staffResult.data || [])
    .filter((row: any) => {
      const user = Array.isArray(row.user) ? row.user[0] : row.user;
      if (String(user?.role || '').toLowerCase() !== 'admin') return true;
      return Boolean(row.applicant_id);
    })
    .map(mapStaffRow)
    .map((member: Staff) => enrichStaffFromRecords(member, documents))
    .map((member: Staff) => ({
      ...member,
      avatarUrl: resolvePreferredAvatarUrl(
        applicantAvatarById.get(member.applicantId || ''),
        member.avatarUrl
      )
    }));
  const staff = await Promise.all(enrichedStaff.map(async member => ({
    ...member,
    avatarUrl: await resolveDisplayAvatarUrl(member.avatarUrl)
  })));

  return {
    applicants,
    staff,
    documents,
    timesheets: (timesheetResult.data || []).map(mapTimesheetRow),
    templates: (templateResult.data || []).map(mapTemplateRow),
    activityLogs: (logResult.data || []).map(mapLogRow),
    familyFeedbacks: (feedbackResult.data || []).map(mapFeedbackRow)
  };
}

export async function insertActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>, actorUserId?: string | null) {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      actor_user_id: actorUserId || null,
      action: log.action,
      actor_name: log.user,
      type: log.type
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapLogRow(data);
}
