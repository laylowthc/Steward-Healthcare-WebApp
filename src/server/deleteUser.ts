import { AdminDeletionError, describeSupabaseError, removeStoredFile, requireActiveAdmin } from './adminDeletion.js';

const isAuthUserNotFound = (error: unknown) => {
  const details = describeSupabaseError(error);
  return details.status === 404 || details.code === 'user_not_found' || /user.*not found/i.test(details.message);
};

export async function deleteUserAccount(input: {
  authorization?: string;
  targetUserId?: string;
}) {
  if (!input.targetUserId) {
    throw new AdminDeletionError('Missing target user ID', 400);
  }

  const { callerId, adminClient } = await requireActiveAdmin(input.authorization);
  const targetUserId = input.targetUserId;

  if (targetUserId === callerId) {
    throw new AdminDeletionError('Administrators cannot delete their own signed-in account', 400);
  }

  const { data: targetUser, error: targetError } = await adminClient
    .from('users')
    .select('id, email, full_name')
    .eq('id', targetUserId)
    .maybeSingle();

  if (targetError) {
    throw new AdminDeletionError(`Failed to load the target user: ${targetError.message}`, 500, {
      databaseError: describeSupabaseError(targetError)
    });
  }
  if (!targetUser) {
    throw new AdminDeletionError('Target user was not found', 404);
  }

  // Do not destroy immutable compliance/audit history. These foreign keys are deliberately RESTRICT.
  const { data: acknowledgements, error: acknowledgementError } = await adminClient
    .from('job_description_acknowledgements')
    .select('id')
    .or(`user_id.eq.${targetUserId},signer_user_id.eq.${targetUserId}`)
    .limit(1);

  if (acknowledgementError) {
    throw new AdminDeletionError('Failed to verify deletion dependencies', 500, {
      databaseError: describeSupabaseError(acknowledgementError)
    });
  }

  if (acknowledgements?.length) {
    throw new AdminDeletionError(
      'This user has immutable Job Description acknowledgement records and cannot be permanently deleted without an approved retention/anonymisation policy.',
      409,
      { dependency: 'job_description_acknowledgements' }
    );
  }

  const { data: documents, error: documentsError } = await adminClient
    .from('documents')
    .select('id, file_path')
    .eq('user_id', targetUserId);

  if (documentsError) {
    throw new AdminDeletionError(`Failed to load the user's documents: ${documentsError.message}`, 500, {
      databaseError: describeSupabaseError(documentsError)
    });
  }

  // Confirm the Auth identity before touching application data. An orphan public.users row is a
  // valid legacy state and should be cleanable; other Auth failures must stop the operation.
  const { data: authLookup, error: authLookupError } = await adminClient.auth.admin.getUserById(targetUserId);
  const authUserExists = Boolean(authLookup?.user);

  if (authLookupError && !isAuthUserNotFound(authLookupError)) {
    throw new AdminDeletionError('Failed to verify the target Supabase Auth account.', 502, {
      authError: describeSupabaseError(authLookupError)
    });
  }

  // Supabase Auth refuses to delete users that still own Storage objects. Remove only the exact
  // document paths already linked to this target, then perform the trusted Auth deletion.
  const removedFiles: string[] = [];
  for (const document of documents || []) {
    const removedPath = await removeStoredFile(adminClient, document.file_path);
    if (removedPath) removedFiles.push(removedPath);
  }

  let authUserDeleted = false;
  if (authUserExists) {
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (authDeleteError) {
      throw new AdminDeletionError('Failed to delete Supabase Auth credentials.', 502, {
        authError: describeSupabaseError(authDeleteError),
        targetUserId,
        storageFilesRemoved: removedFiles.length
      });
    }
    authUserDeleted = true;
  }

  const { error: profileDeleteError } = await adminClient
    .from('users')
    .delete()
    .eq('id', targetUserId);

  if (profileDeleteError) {
    throw new AdminDeletionError(
      authUserDeleted
        ? 'Supabase Auth credentials were removed, but application profile cleanup failed. The account is partially deleted and requires server-side reconciliation.'
        : 'The orphaned application profile could not be removed.',
      500,
      {
        databaseError: describeSupabaseError(profileDeleteError),
        authUserDeleted,
        targetUserId
      }
    );
  }

  return {
    targetUserId,
    email: targetUser.email,
    authUserDeleted,
    orphanAuthProfile: !authUserExists,
    documentsDeletedCount: documents?.length || 0,
    physicalFilesDeleted: removedFiles
  };
}
