import { Staff } from '../types';

export const isApprovedStaffProfile = (person: Staff) => person.accountRole === 'staff';
