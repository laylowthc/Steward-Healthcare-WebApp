import type { Request, Response } from 'express';
import { inviteUser, InviteUserError } from '../../src/server/inviteUser.js';

const jsonError = (response: Response, status: number, message: string) =>
  response.status(status).json({ success: false, message });

const CANONICAL_PRODUCTION_APP_URL = 'https://steward-healthcare-web-app.vercel.app';

const resolveRedirectUrl = () => CANONICAL_PRODUCTION_APP_URL;

export default async function handler(request: Request, response: Response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return jsonError(response, 405, 'Method not allowed.');
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {});
    const result = await inviteUser({
      authorization: request.headers.authorization,
      email: body.email,
      fullName: body.fullName,
      role: body.role,
      redirectTo: resolveRedirectUrl()
    });

    return response.status(200).json({
      success: true,
      message: `Invitation sent to ${result.user.email}.`,
      ...result
    });
  } catch (error) {
    console.error('[api/admin/invite-user] Failed:', error);
    const status = error instanceof InviteUserError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return jsonError(response, status, message);
  }
}
