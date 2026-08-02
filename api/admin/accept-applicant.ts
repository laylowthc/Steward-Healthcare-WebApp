import type { Request, Response } from 'express';
import { acceptApplicant, AcceptApplicantError } from '../../src/server/acceptApplicant.js';

export default async function handler(request: Request, response: Response) {
  response.setHeader('Content-Type', 'application/json');
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  try {
    const result = await acceptApplicant({
      authorization: request.headers.authorization,
      applicantId: request.body?.applicantId
    });
    return response.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error instanceof AcceptApplicantError ? error.statusCode : 500;
    return response.status(status).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
}
