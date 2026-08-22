export const PERSONNEL_FILES_HASH = '#personnel-files';

export const adminNavigationItems = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Global credentials summary' },
  { id: 'recruitment', label: 'Recruitment', desc: 'Registered onboarding pool' },
  { id: 'staff', label: 'Approved Staff', desc: 'Operational caregiver roster' },
  { id: 'vault', label: 'Documents', desc: 'GDPR contract records storage' },
  { id: 'compliance', label: 'Compliance', desc: 'Deployment checks and credential alerts' },
  { id: 'personnel', label: 'Personnel Files', desc: 'Live employment record completeness' },
  { id: 'training', label: 'Training & Credentials', desc: 'Role requirements, evidence and expiry status' },
  { id: 'templates', label: 'Roles', desc: 'Criteria checklists by role' },
  { id: 'timesheets', label: 'Timesheets', desc: 'Shift approvals and pays metrics' },
  { id: 'workspace', label: 'Google Workspace', desc: 'Drive & Sheets Integration' },
  { id: 'family_feedback', label: 'Family Surveys Hub', desc: 'Real-time client satisfaction' },
  { id: 'administration', label: 'User Administration', desc: 'Manage system users and access roles' },
] as const;

export const adminTabFromHash = (hash: string) => hash === PERSONNEL_FILES_HASH ? 'personnel' : undefined;
