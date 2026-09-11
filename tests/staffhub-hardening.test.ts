import assert from 'node:assert/strict';
import test from 'node:test';
import { describeSupabaseError, normalizeDocumentStoragePath } from '../src/server/adminDeletion.js';
import { resolveStaffHubInviteRedirect } from '../src/server/inviteRedirect.js';

test('Supabase errors retain actionable diagnostics instead of serializing to {}', () => {
  const diagnostics = describeSupabaseError({
    name: 'AuthApiError',
    message: 'User not found',
    status: 404,
    code: 'user_not_found',
    hint: 'Check the Auth user id'
  });

  assert.equal(diagnostics.message, 'User not found');
  assert.equal(diagnostics.status, 404);
  assert.equal(diagnostics.code, 'user_not_found');
  assert.equal(diagnostics.hint, 'Check the Auth user id');
  assert.notEqual(JSON.stringify(diagnostics), '{}');
});

test('empty Supabase errors receive a useful fallback message', () => {
  assert.equal(
    describeSupabaseError({}).message,
    'Supabase returned an error without a message.'
  );
});

test('document URLs are reduced to safe bucket-relative paths', () => {
  assert.equal(
    normalizeDocumentStoragePath('https://example.supabase.co/storage/v1/object/public/documents/user/file.pdf?download=1'),
    'user/file.pdf'
  );
  assert.equal(normalizeDocumentStoragePath('blob:local-preview'), null);
});

test('invite redirects always use the deployed StaffHub setup route', () => {
  assert.equal(
    resolveStaffHubInviteRedirect({ VERCEL_PROJECT_PRODUCTION_URL: 'steward-healthcare-web-app.vercel.app' }),
    'https://steward-healthcare-web-app.vercel.app/invite'
  );

  assert.equal(
    resolveStaffHubInviteRedirect({ STAFFHUB_APP_URL: 'https://staffhub.example.com/' }),
    'https://staffhub.example.com/invite'
  );
});

test('invite redirect refuses to guess a development or preview URL', () => {
  assert.throws(
    () => resolveStaffHubInviteRedirect({ VERCEL_URL: 'preview-123.vercel.app' }),
    /production URL is not configured/
  );
});
