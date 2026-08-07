import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class AdminDeletionError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AdminDeletionError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const normalizeDocumentStoragePath = (value?: string | null) => {
  if (!value) return null;
  let path = value.trim();

  if (path.startsWith('blob:') || path.startsWith('data:')) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const marker = '/documents/';
    if (!path.includes(marker)) return null;
    path = path.split(marker).pop() || '';
  }

  path = path.split('?')[0].replace(/^\/+/, '');
  if (path.startsWith('documents/')) path = path.slice('documents/'.length);
  return path || null;
};

export async function requireActiveAdmin(authorization?: string) {
  if (!authorization?.startsWith('Bearer ')) {
    throw new AdminDeletionError('Missing or invalid authorization header', 401);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    throw new AdminDeletionError('Supabase server configuration is incomplete', 500);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const token = authorization.slice('Bearer '.length);
  const { data: authData, error: authError } = await userClient.auth.getUser(token);

  if (authError || !authData.user) {
    throw new AdminDeletionError('Invalid or expired session token', 401);
  }

  const { data: caller, error: callerError } = await adminClient
    .from('users')
    .select('id, role, status')
    .eq('id', authData.user.id)
    .single();

  if (
    callerError ||
    !caller ||
    String(caller.role).toLowerCase() !== 'admin' ||
    caller.status !== 'Active'
  ) {
    throw new AdminDeletionError('Forbidden: active administrative privileges required', 403);
  }

  return { callerId: authData.user.id, adminClient };
}

export async function removeStoredFile(adminClient: SupabaseClient, filePath?: string | null) {
  const normalizedPath = normalizeDocumentStoragePath(filePath);
  if (!normalizedPath) return null;

  const { error } = await adminClient.storage.from('documents').remove([normalizedPath]);
  if (error) {
    throw new AdminDeletionError('Failed to delete the stored file', 500, {
      path: normalizedPath,
      storageError: error.message
    });
  }
  return normalizedPath;
}
