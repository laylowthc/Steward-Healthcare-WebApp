import { Staff } from '../types';

export type ComplianceState = 'Restricted' | 'Expiring' | 'Compliant';

export const isApprovedStaffProfile = (person: Staff) => person.accountRole === 'staff';

export const getComplianceState = (person: Staff): ComplianceState => {
  if (person.status === 'Suspended' || person.accountStatus === 'Suspended') return 'Restricted';

  const requiredChecks = [person.dbsStatus, person.rightToWork, person.trainingStatus, person.referenceStatus];
  if (requiredChecks.some(status => status === 'Pending' || status === 'Non-Compliant' || !status)) {
    return 'Restricted';
  }

  if (person.role === 'Nurse') {
    if (!person.nmcExpiry || new Date(person.nmcExpiry).getTime() <= Date.now()) return 'Restricted';
    const daysRemaining = Math.ceil((new Date(person.nmcExpiry).getTime() - Date.now()) / 86_400_000);
    if (daysRemaining <= 45) return 'Expiring';
  }

  if (requiredChecks.includes('Expiring')) return 'Expiring';
  return requiredChecks.every(status => status === 'Compliant') ? 'Compliant' : 'Restricted';
};

export const isFullyCompliantStaff = (person: Staff) =>
  isApprovedStaffProfile(person) && getComplianceState(person) === 'Compliant';
