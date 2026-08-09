import { AdminDeletionError, removeStoredFile, requireActiveAdmin } from './adminDeletion.js';

export async function deleteDocument(input: {
  authorization?: string;
  documentId?: string;
}) {
  if (!input.documentId) throw new AdminDeletionError('Missing document ID', 400);
  const { adminClient } = await requireActiveAdmin(input.authorization);

  const { data: document, error: loadError } = await adminClient
    .from('documents')
    .select('id, document_name, file_path')
    .eq('id', input.documentId)
    .maybeSingle();
  if (loadError) throw new AdminDeletionError(`Failed to load the document: ${loadError.message}`, 500);
  if (!document) throw new AdminDeletionError('Document was not found', 404);

  const removedPath = await removeStoredFile(adminClient, document.file_path);
  const { data: deleted, error: deleteError } = await adminClient
    .from('documents')
    .delete()
    .eq('id', input.documentId)
    .select('id')
    .maybeSingle();
  if (deleteError) throw new AdminDeletionError(`Failed to delete the document record: ${deleteError.message}`, 500);
  if (!deleted) throw new AdminDeletionError('Document deletion did not remove a database record', 409);

  return {
    documentId: input.documentId,
    documentName: document.document_name,
    physicalFileDeleted: removedPath
  };
}
