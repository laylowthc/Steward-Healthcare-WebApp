import type { Request, Response } from 'express';
import { AdminAccountStatusError, updateAccountStatus } from '../../src/server/adminAccountStatus.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const user = await updateAccountStatus({
      authorization: req.headers.authorization,
      targetUserId: body.targetUserId,
      status: body.status
    });

    return res.status(200).json({ success: true, user });
  } catch (error: any) {
    console.error('[api/admin/user-status] Failed:', error);
    const statusCode = error instanceof AdminAccountStatusError ? error.statusCode : 500;
    return res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
  }
}
