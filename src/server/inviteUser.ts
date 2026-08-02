import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class InviteUserError extends Error {
  constructor(message: string, public readonly statusCode = 500) {
    super(message);
    this.name = 'InviteUserError';
  }
}

type InviteUserInput = {
  authorization?: string;
  email?: unknown;
  fullName?: unknown;
  role?: unknown;
  redirectTo?: string;
};

const supportedRoles = new Set(['Admin', 'Staff', 'Applicant', 'Family']);

const getClients = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    throw new InviteUserError('Invitation service configuration is incomplete.', 500);
  }

  return {
    sessionClient: createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    }),
    adminClient: createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  };
};

const requireActiveAdmin = async (
  authorization: string | undefined,
  sessionClient: SupabaseClient,
  adminClient: SupabaseClient
) => {
  if (!authorization?.startsWith('Bearer ')) {
    throw new InviteUserError('Missing or invalid authorization header.', 401);
  }

  const token = authorization.slice('Bearer '.length).trim();
  const { data: authData, error: authError } = await sessionClient.auth.getUser(token);
  if (authError || !authData.user) {
    throw new InviteUserError('Invalid or expired administrator session.', 401);
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('id, full_name, role, status')
    .eq('id', authData.user.id)
    .single();

  if (
    profileError ||
    !profile ||
    String(profile.role).toLowerCase() !== 'admin' ||
    profile.status !== 'Active'
  ) {
    throw new InviteUserError('Active administrator privileges are required.', 403);
  }

  return { authUser: authData.user, profile };
};

const normalizeInput = (input: InviteUserInput) => {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const role = typeof input.role === 'string' && supportedRoles.has(input.role)
    ? input.role
    : 'Applicant';

  if (!fullName) throw new InviteUserError('Full name is required.', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new InviteUserError('A valid email address is required.', 400);
  }

  return { email, fullName, role };
};

export const inviteUser = async (input: InviteUserInput) => {
  const { sessionClient, adminClient } = getClients();
  const caller = await requireActiveAdmin(input.authorization, sessionClient, adminClient);
  const { email, fullName, role } = normalizeInput(input);

  const { data: existingProfiles, error: existingProfileError } = await adminClient
    .from('users')
    .select('id, email, status')
    .eq('email', email)
    .limit(1);

  if (existingProfileError) {
    throw new InviteUserError('Unable to check whether this user already exists.', 500);
  }
  if (existingProfiles?.length) {
    throw new InviteUserError('A user with this email address already exists.', 409);
  }

  const inviteOptions: { data: Record<string, string>; redirectTo?: string } = {
    data: { full_name: fullName, role }
  };
  if (input.redirectTo) inviteOptions.redirectTo = input.redirectTo;

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    inviteOptions
  );

  if (inviteError || !inviteData.user?.id) {
    throw new InviteUserError(
      inviteError?.message || 'Supabase did not create an invitation account.',
      inviteError?.status || 502
    );
  }

  const invitedUserId = inviteData.user.id;
  const profilePayload = {
    id: invitedUserId,
    firebase_uid: invitedUserId,
    email,
    full_name: fullName,
    role,
    status: 'Pending',
    permissions: [],
    updated_at: new Date().toISOString()
  };

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .upsert(profilePayload, { onConflict: 'email' })
    .select('*')
    .single();

  if (profileError) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(invitedUserId);
    if (rollbackError) {
      console.error('[invite-user] Failed to roll back Auth user:', rollbackError.message);
    }
    throw new InviteUserError(`Invitation email was generated, but the account profile could not be created: ${profileError.message}`, 500);
  }

  const { error: logError } = await adminClient.from('activity_logs').insert({
    actor_user_id: caller.authUser.id,
    actor_name: caller.profile.full_name || 'Administrator',
    type: 'status',
    action: `INVITATION: Sent ${role} invitation to ${fullName} (${email}); account status Pending.`
  });
  if (logError) console.error('[invite-user] Activity log failed:', logError.message);

  return { user: profile, inviteSent: true };
};
