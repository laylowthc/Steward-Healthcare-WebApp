import assert from 'node:assert/strict';
import { Staff } from '../src/types';
import { getComplianceState, isApprovedStaffProfile, isFullyCompliantStaff } from '../src/lib/complianceState';

const profile = (overrides: Partial<Staff> = {}): Staff => ({
  id: 'staff-id',
  name: 'Test Person',
  email: 'person@example.com',
  phone: '',
  address: '',
  role: 'Care Assistant',
  status: 'Active',
  accountRole: 'staff',
  accountStatus: 'Active',
  rosterStatus: 'Deployable',
  dbsStatus: 'Compliant',
  rightToWork: 'Compliant',
  trainingStatus: 'Compliant',
  referenceStatus: 'Compliant',
  joinedDate: '2026-01-01',
  ...overrides,
});

assert.equal(isApprovedStaffProfile(profile()), true, 'staff accounts form the approved staff population');
assert.equal(isApprovedStaffProfile(profile({ accountRole: 'applicant' })), false, 'candidate-linked profiles are not approved staff');
assert.equal(getComplianceState(profile({ dbsStatus: 'Pending' })), 'Restricted', 'pending checks never fall through to compliant');
assert.equal(getComplianceState(profile({ trainingStatus: 'Expiring' })), 'Expiring', 'expiring checks remain distinct');
assert.equal(getComplianceState(profile()), 'Compliant', 'all configured core checks can be compliant');
assert.equal(isFullyCompliantStaff(profile({ accountRole: 'applicant' })), false, 'a compliant candidate is not counted as fully compliant staff');
assert.equal(getComplianceState(profile({ role: 'Nurse', nmcExpiry: undefined })), 'Restricted', 'Nurses require a current NMC expiry');

console.log('Compliance population and status scenarios passed.');
