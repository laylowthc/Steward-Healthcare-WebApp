import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260822113000_sprint_4c_job_description_business_input_closure.sql', import.meta.url),
  'utf8',
);

assert.match(migration, /'Care Assistant \/ Care Worker', '2\.0', date '2026-08-22'/, 'Care approved wording is published as v2.0');
assert.match(migration, /set title = 'Nurse',[\s\S]*effective_date = date '2026-08-22'/, 'the unsigned Nurse v1.0 placeholder is completed in place');
assert.match(migration, /Appropriate current NMC registration/, 'Nurse professional registration wording is controlled content');
assert.match(migration, /within my training, competence, SHC policies/, 'Care acknowledgement wording is persisted');
assert.match(migration, /within my professional registration, training and competence, SHC policies/, 'Nurse acknowledgement wording is persisted');
assert.match(migration, /applicant\.role_id = job_description_acknowledgements\.role_id/, 'acknowledgement RLS compares the persisted applicant role to the inserted snapshot role');
assert.doesNotMatch(migration, /Administrators cannot sign a Job Description/, 'dual-role users are not rejected before ownership and role checks');
assert.match(migration, /Signed Job Description versions cannot be changed/, 'signed controlled wording remains immutable');
assert.match(migration, /Job Description versions must be retained; disable them instead/, 'controlled definitions cannot be deleted');

console.log('Job Description migration safeguards passed.');
