import type { Request, Response } from 'express';
import { AdminDeletionError } from '../../src/server/adminDeletion.js';
import { deleteDocument } from '../../src/server/deleteDocument.js';

export default async function handler(request: Request, response: Response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'DELETE') {
    response.setHeader('Allow', 'DELETE');
    return response.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {});
    const details = await deleteDocument({
      authorization: request.headers.authorization,
      documentId: body.documentId
    });
    return response.status(200).json({ success: true, message: 'Document deleted successfully.', details });
  } catch (error) {
    console.error('[api/admin/delete-document] Failed:', error);
    const status = error instanceof AdminDeletionError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const details = error instanceof AdminDeletionError ? error.details : undefined;
    return response.status(status).json({ success: false, message, details });
  }
}
