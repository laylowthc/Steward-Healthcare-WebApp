# Sprint 4C post-sprint hardening audit

Scope: administrative user deletion, invitation redirect/setup routing, and `public.users` security. No production data or production Supabase configuration was changed.

## Deletion finding

The active `/api/admin/delete-user` path correctly keeps the Supabase administrative client server-side, but the old deletion sequence was unsafe and diagnostically weak:

1. It trusted the `public.users` row as proof that an Auth user existed.
2. It deleted linked Storage objects before verifying the Auth identity.
3. It called `auth.admin.deleteUser()` unconditionally.
4. Any Auth failure was collapsed to the `message` string, which produced the observed unhelpful `{}` response.
5. `public.users` is not a foreign-key child of `auth.users`, so orphaned profile rows are possible.

Production inspection found `public.users` contains an orphaned row with no matching `auth.users` record. The existing logs do not expose the target ID of the failed deletion attempt, so the orphan row is a confirmed failure mode but cannot be asserted as the exact target of the reported attempt.

The hardened path now verifies Auth existence first, distinguishes a genuine Auth lookup failure from an already-missing Auth identity, preflights the restrictive Job Description acknowledgement foreign keys, removes linked files plus orphaned avatar objects, performs trusted Auth deletion only when the Auth user exists, and finally removes the application profile. Supabase errors now retain message/code/status/details/hint diagnostics.

## Invitation finding

The invitation uses `auth.admin.inviteUserByEmail()` server-side and already sets `requires_password_setup: true`. The application already renders `FirstTimePasswordSetup` when that marker is present and the Supabase browser client uses the normal URL-session detection flow.

The redirect bug was caused by the API supplying a hard-coded Vercel URL. Supabase ignores an invite `redirectTo` when that URL is not present in the project's allowed redirect URLs and falls back to the configured Site URL. The hardened implementation now resolves the canonical production host from `STAFFHUB_APP_URL` or Vercel's `VERCEL_PROJECT_PRODUCTION_URL` and appends `/invite`; it never falls back to `VERCEL_URL`, so preview URLs cannot become invitation destinations.

Promotion prerequisite: add the production setup URL to Supabase Authentication > URL Configuration allowed redirect URLs. For the current Vercel project this is `https://steward-healthcare-web-app.vercel.app/invite`. This dashboard configuration was deliberately not changed during this hardening pass.

## `public.users` RLS finding

Current production state:

- RLS: disabled.
- `anon`: SELECT/INSERT/UPDATE/DELETE granted.
- `authenticated`: SELECT/INSERT/UPDATE/DELETE granted.
- Rows currently exist, despite stale metadata indicating otherwise.
- `public.users.id` is not protected by a foreign key to `auth.users.id`.
- `firebase_uid` is a legacy/application identity field and currently mirrors the Auth/Firebase-style UUID in the active flows.
- Admin status is determined from `public.users.role = 'Admin'` and `status = 'Active'`.
- The application queries `public.users` directly from the browser for profile reads and user administration; self-registration also inserts rows directly.
- Server-side administrative flows use the trusted service-role client.
- The existing `public.current_user_is_admin()` helper is `SECURITY DEFINER`, owned by `postgres`, with `search_path = public`, and is executable by public/anon/authenticated.

A safe RLS migration is therefore **not a drop-in change**. Enabling RLS without first moving privileged role/status/permissions writes server-side would either break existing functionality or create a privilege-escalation path. The recommended least-privilege model is:

- `anon`: no access to `public.users`.
- `authenticated`: read only the caller's own profile, except active admins may read all profiles.
- Self-insert: only the caller's own UUID, with controlled initial role/status (`Applicant`/`Pending`).
- Self-update: only ordinary profile fields such as `full_name` and `phone`.
- `role`, `status`, `permissions`, `firebase_uid`, and identity linkage: server-side only.
- Delete: server-side trusted operation only.
- Long-term: make `public.users.id` reference `auth.users.id ON DELETE CASCADE` after reconciling the existing orphan and validating all profile IDs.
- Move the exposed admin-role helper to a private schema and grant execution only where required.

No RLS migration was applied or created in this branch because the required coordinated refactor is not safely achievable as a minimal, untested database-only change. This is intentionally left as a documented security migration rather than weakening security or risking Sprint 3A–4C functionality.
