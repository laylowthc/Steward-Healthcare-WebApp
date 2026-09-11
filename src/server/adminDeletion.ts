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

export const describeSupabaseError = (error: unknown) => {
  const candidate = (error && typeof error === 'object') ? error as Record<string, unknown> : {};
  const message = typeof candidate.message === 'string' && candidate.message.trim()
    ? candidate.message.trim()
    : 'Supabase returned an error without a message.';

  return {
    message,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
    details: typeof candidate.details === 'string' ? candidate.details : undefined,
    hint: typeof candidate.hint === 'string' ? candidate.hint : undefined
  };
};

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
    throw new AdminDeletionError('Invalid or expired session token', 401, {
      authError: describeSupabaseError(authError)
    });
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
    throw new AdminDeletionError('Forbidden: active administrative privileges required', 403, {
      profileError: callerError ? describeSupabaseError(callerError) : undefined
    });
  }

  return { callerId: authData.user.id, adminClient };
}

export async function removeStoredFile(adminClient: SupabaseClient, filePath?: string | null) {
  const normalizedPath = normalizeDocumentStoragePath(filePath);
  if (!normalizedPath) return null;

  const { error } = await adminClient.storage.from('documents').remove([normalizedPath]);
  if (error) {
    throw new AdminDeletionError('Failed to delete the stored file', 502, {
      path: normalizedPath,
      storageError: describeSupabaseError(error)
    });
  }
  return normalizedPath;
}

export async function removeUserAvatarFiles(adminClient: SupabaseClient, userId: string) {
  const { data: files, error: listError } = await adminClient.storage
    .from('documents')
    .list('avatars', { limit: 1000, search: `${userId}_` });

  if (listError) {
    throw new AdminDeletionError('Failed to verify the user\'s avatar storage objects', 502, {
      storageError: describeSupabaseError(listError),
      folder: 'avatars'
    });
  }

  const names = (files || [])
    .filter(file => file.name.startsWith(`${userId}_`))
    .map(file => `avatars/${file.name}`);

  if (!names.length) return [];

  const { error: removeError } = await adminClient.storage.from('documents').remove(names);
  if (removeError) {
    throw new AdminDeletionError('Failed to remove the user\'s remaining avatar storage objects', 502, {
      storageError: describeSupabaseError(removeError),
      paths: names
    });
  }

  return names;
}
