import { AdminDeletionError, removeStoredFile, requireActiveAdmin } from './adminDeletion.js';

export async function deleteUserAccount(input: {
  authorization?: string;
  targetUserId?: string;
}) {
  if (!input.targetUserId) {
    throw new AdminDeletionError('Missing target user ID', 400);
  }

  const { callerId, adminClient } = await requireActiveAdmin(input.authorization);
  if (input.targetUserId === callerId) {
    throw new AdminDeletionError('Administrators cannot delete their own signed-in account', 400);
  }

  const { data: targetUser, error: targetError } = await adminClient
    .from('users')
    .select('id, email, full_name')
    .eq('id', input.targetUserId)
    .maybeSingle();
  if (targetError) throw new AdminDeletionError(`Failed to load the target user: ${targetError.message}`, 500);
  if (!targetUser) throw new AdminDeletionError('Target user was not found', 404);

  const { data: documents, error: documentsError } = await adminClient
    .from('documents')
    .select('id, file_path')
    .eq('user_id', input.targetUserId);
  if (documentsError) {
    throw new AdminDeletionError(`Failed to load the user's documents: ${documentsError.message}`, 500);
  }

  const removedFiles: string[] = [];
  for (const document of documents || []) {
    const removedPath = await removeStoredFile(adminClient, document.file_path);
    if (removedPath) removedFiles.push(removedPath);
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(input.targetUserId);
  if (authDeleteError) {
    throw new AdminDeletionError(`Failed to delete Supabase Auth credentials: ${authDeleteError.message}`, 500);
  }

  const { error: profileDeleteError } = await adminClient
    .from('users')
    .delete()
    .eq('id', input.targetUserId);
  if (profileDeleteError) {
    throw new AdminDeletionError(`Auth credentials were removed, but profile cleanup failed: ${profileDeleteError.message}`, 500);
  }

  return {
    targetUserId: input.targetUserId,
    email: targetUser.email,
    documentsDeletedCount: documents?.length || 0,
    physicalFilesDeleted: removedFiles
  };
}
