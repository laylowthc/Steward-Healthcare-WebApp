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
