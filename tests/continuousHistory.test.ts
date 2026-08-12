import assert from 'node:assert/strict';
import {
  analyseChronology,
  applicationChronologyEntries,
  chronologyValidationMessages,
  normalizeChronologyEntries,
} from '../src/lib/continuousHistory';
import { ChronologyEntry, OfficialApplicationData } from '../src/types/officialApplication';
import { validateOfficialApplication } from '../src/lib/officialApplicationValidation';
import { RoleTemplate } from '../src/types';

const asOf = new Date(2026, 7, 12);
const entry = (overrides: Partial<ChronologyEntry>): ChronologyEntry => ({
  id: overrides.id || `entry-${Math.random()}`,
  type: 'employment',
  organisation: 'Organisation',
  title: 'Role',
  startMonth: '2020-01',
  endMonth: '2020-12',
  isCurrent: false,
  location: '',
  details: '',
  reasonForLeaving: '',
  ...overrides,
});

const school = entry({
  id: 'school',
  type: 'secondary_education',
  organisation: 'Example High School',
  title: 'Secondary education',
  startMonth: '2018-01',
  endMonth: '2021-06',
});
const presentJob = entry({ id: 'current-job', startMonth: '2021-07', endMonth: '', isCurrent: true });

// Scenario A: complete high-school-to-present coverage is valid.
const complete = analyseChronology([school, presentJob], asOf);
assert.equal(complete.complete, true);
assert.deepEqual(complete.gaps, []);

// Scenario B: draft data can exist without high school, but completion validation is explicit.
const missingSchool = analyseChronology([presentJob], asOf);
assert.equal(missingSchool.hasSecondaryEducation, false);
assert.equal(missingSchool.complete, false);

// Scenario C: April through June is detected between March and July records.
const unexplained = analyseChronology([
  entry({ ...school, startMonth: '2018-01', endMonth: '2024-03' }),
  entry({ id: 'next-job', startMonth: '2024-07', endMonth: '', isCurrent: true }),
], asOf);
assert.deepEqual(unexplained.gaps.map(gap => [gap.startMonth, gap.endMonth, gap.durationMonths]), [
  ['2024-04', '2024-06', 3],
]);

// Scenario D: a persisted unemployment entry resolves that interval.
const explanation = entry({
  id: 'gap-explanation',
  type: 'unemployment',
  organisation: '',
  title: '',
  startMonth: '2024-04',
  endMonth: '2024-06',
  details: 'Seeking work',
});
const explained = analyseChronology([
  entry({ ...school, startMonth: '2018-01', endMonth: '2024-03' }),
  explanation,
  entry({ id: 'next-job', startMonth: '2024-07', endMonth: '', isCurrent: true }),
], asOf);
assert.equal(explained.complete, true);
assert.equal(normalizeChronologyEntries(JSON.parse(JSON.stringify([explanation])))[0].details, 'Seeking work');

// Scenario E: overlapping education and employment merge into one coverage span.
const overlapping = analyseChronology([
  school,
  entry({ id: 'part-time-job', startMonth: '2020-01', endMonth: '2022-12' }),
  entry({ id: 'next-job', startMonth: '2023-01', endMonth: '', isCurrent: true }),
], asOf);
assert.equal(overlapping.gaps.length, 0);

// Scenario F: Present covers through the current month without a false trailing gap.
assert.equal(analyseChronology([school, presentJob], asOf).gaps.length, 0);

// Scenario G: legacy employer JSON is safely normalized and survives serialization.
const legacy = normalizeChronologyEntries([{
  employerNameAddress: 'Legacy Care Ltd',
  postcode: 'AB1 2CD',
  telephone: '07000000000',
  dateFrom: '2021-07-01',
  dateTo: '2022-03-31',
  positionHeld: 'Care Assistant',
  reasonForLeaving: 'Progression',
}]);
assert.deepEqual(legacy[0], {
  id: 'legacy-employer-0',
  type: 'employment',
  organisation: 'Legacy Care Ltd',
  title: 'Care Assistant',
  startMonth: '2021-07',
  endMonth: '2022-03',
  isCurrent: false,
  location: 'AB1 2CD',
  details: '',
  reasonForLeaving: 'Progression',
  legacyPostcode: 'AB1 2CD',
  legacyTelephone: '07000000000',
});

// Application-level validation reports actionable periods rather than a generic error.
const application = {
  roleId: 'role-id',
  employmentHistory: [school, entry({ id: 'old-job', startMonth: '2021-07', endMonth: '2024-03' }), entry({ id: 'new-job', startMonth: '2024-07', endMonth: '', isCurrent: true })],
  recentEmployerNameAddress: '', recentEmployerPositionTitle: '', recentEmployerDateFrom: '', recentEmployerDateTo: '',
  recentEmployerPrimaryResponsibilities: '', recentEmployerReasonForLeaving: '', recentEmployerPostcode: '', recentEmployerTelephone: '',
} as OfficialApplicationData;
assert.equal(applicationChronologyEntries(application).length, 3);
assert(chronologyValidationMessages(application, asOf).some(message => message.includes('April 2024') && message.includes('June 2024')));

const chronologyRole = {
  id: 'role-id', role: 'Configured role', slug: 'configured-role', description: '', salaryRange: '', responsibilities: [], requiredCredentials: [], active: true,
  requirements: [{
    id: 'requirement-id', roleId: 'role-id', requirementKey: 'continuous_history', displayName: 'Continuous history',
    stage: 'application', requirementType: 'information_field', responsibleParty: 'applicant', required: true, sortOrder: 20, metadata: {}, active: true,
  }],
} as RoleTemplate;
assert(validateOfficialApplication(application, chronologyRole).some(message => message.includes('April 2024')), 'unresolved gap blocks final submission');
assert.equal(validateOfficialApplication({ ...application, employmentHistory: [school, presentJob] }, chronologyRole).length, 0, 'complete chronology allows final submission');
assert(validateOfficialApplication({ ...application, employmentHistory: [presentJob] }, chronologyRole).some(message => message.includes('secondary/high-school')), 'missing high school blocks final submission clearly');

console.log('Continuous history scenarios passed.');
