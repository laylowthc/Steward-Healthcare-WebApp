import assert from 'node:assert/strict';
import { Staff } from '../src/types';
import { isApprovedStaffProfile } from '../src/lib/complianceState';

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
console.log('Approved Staff population scenarios passed; deployment state is covered by deploymentReadiness.test.ts.');
