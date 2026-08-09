import { createClient } from '@supabase/supabase-js';
import type { AccountStatus } from '../types';

const ACCOUNT_STATUSES: AccountStatus[] = ['Pending', 'Active', 'Suspended'];

export class AdminAccountStatusError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AdminAccountStatusError';
    this.statusCode = statusCode;
  }
}

const getSupabaseClients = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey) {
    throw new AdminAccountStatusError('Supabase server configuration is incomplete', 500);
  }

  return {
    userClient: createClient(supabaseUrl, supabasePublishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    }),
    adminClient: createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  };
};

export async function updateAccountStatus(input: {
  authorization?: string;
  targetUserId?: string;
  status?: string;
}) {
  const { authorization, targetUserId, status } = input;

  if (!authorization?.startsWith('Bearer ')) {
    throw new AdminAccountStatusError('Missing or invalid authorization header', 401);
  }
  if (!targetUserId) {
    throw new AdminAccountStatusError('Missing target user ID', 400);
  }
  if (!ACCOUNT_STATUSES.includes(status as AccountStatus)) {
    throw new AdminAccountStatusError('Invalid account status', 400);
  }

  const token = authorization.slice('Bearer '.length);
  const { userClient, adminClient } = getSupabaseClients();
  const { data: authData, error: authError } = await userClient.auth.getUser(token);

  if (authError || !authData.user) {
    throw new AdminAccountStatusError('Invalid or expired session token', 401);
  }

  const { data: callerProfile, error: callerError } = await adminClient
    .from('users')
    .select('id, role, status')
    .eq('id', authData.user.id)
    .single();

  if (
    callerError ||
    !callerProfile ||
    String(callerProfile.role).toLowerCase() !== 'admin' ||
    callerProfile.status !== 'Active'
  ) {
    throw new AdminAccountStatusError('Forbidden: active administrative privileges required', 403);
  }

  if (targetUserId === authData.user.id && status !== 'Active') {
    throw new AdminAccountStatusError('Administrators cannot suspend or deactivate their own account', 400);
  }

  const { data: targetUser, error: targetUserError } = await adminClient
    .from('users')
    .select('id, full_name, email, phone, role')
    .eq('id', targetUserId)
    .single();

  if (targetUserError || !targetUser) {
    throw new AdminAccountStatusError('Target user was not found', 404);
  }

  if (status === 'Active' && String(targetUser.role).toLowerCase() === 'applicant') {
    const { data: linkedApplicant, error: linkedApplicantError } = await adminClient
      .from('applicants')
      .select('id')
      .eq('user_id', targetUserId)
      .limit(1)
      .maybeSingle();

    if (linkedApplicantError) {
      throw new AdminAccountStatusError(`Failed to verify applicant profile: ${linkedApplicantError.message}`, 500);
    }

    if (!linkedApplicant) {
      const normalizedEmail = String(targetUser.email || '').toLowerCase();
      const { data: applicantByEmail, error: applicantByEmailError } = await adminClient
        .from('applicants')
        .select('id, user_id')
        .ilike('email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (applicantByEmailError) {
        throw new AdminAccountStatusError(`Failed to resolve applicant profile: ${applicantByEmailError.message}`, 500);
      }

      if (applicantByEmail) {
        const { error: linkError } = await adminClient
          .from('applicants')
          .update({ user_id: targetUserId, updated_at: new Date().toISOString() })
          .eq('id', applicantByEmail.id);

        if (linkError) {
          throw new AdminAccountStatusError(`Failed to link applicant profile: ${linkError.message}`, 500);
        }
      } else {
        const { error: createApplicantError } = await adminClient.from('applicants').insert({
          user_id: targetUserId,
          full_name: targetUser.full_name || normalizedEmail || 'Applicant',
          email: normalizedEmail,
          phone: targetUser.phone || '',
          position: 'Care Assistant',
          status: 'Applied',
          notes: 'Applicant profile created during account activation.',
        });

        if (createApplicantError) {
          throw new AdminAccountStatusError(`Failed to create applicant profile: ${createApplicantError.message}`, 500);
        }
      }
    }
  }

  const { data: updatedUser, error: updateError } = await adminClient
    .from('users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)
    .select('*')
    .single();

  if (updateError || !updatedUser) {
    throw new AdminAccountStatusError(
      updateError?.message || 'Failed to update account status',
      updateError?.code === 'PGRST116' ? 404 : 500
    );
  }

  const { error: logError } = await adminClient.from('activity_logs').insert({
    actor_user_id: authData.user.id,
    actor_name: 'Administrator',
    type: 'status',
    action: `ACCOUNT: Updated ${updatedUser.email} account status to ${status}.`
  });

  if (logError) {
    console.error('[update-user-status] Activity log failed:', logError);
  }

  return updatedUser;
}
