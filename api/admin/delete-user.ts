import type { Request, Response } from 'express';
import { AdminDeletionError } from '../../src/server/adminDeletion.js';
import { deleteUserAccount } from '../../src/server/deleteUser.js';

export default async function handler(request: Request, response: Response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {});
    const details = await deleteUserAccount({
      authorization: request.headers.authorization,
      targetUserId: body.targetUserId
    });
    return response.status(200).json({ success: true, message: 'User deleted successfully.', details });
  } catch (error) {
    console.error('[api/admin/delete-user] Failed:', error);
    const status = error instanceof AdminDeletionError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const details = error instanceof AdminDeletionError ? error.details : undefined;
    return response.status(status).json({ success: false, message, details });
  }
}
