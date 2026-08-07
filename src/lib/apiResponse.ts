export interface ApiResponseBody {
  success?: boolean;
  message?: string;
  error?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function readApiResponse(response: Response): Promise<ApiResponseBody> {
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (!contentType.includes('application/json')) {
    throw new Error(
      `The server returned ${contentType || 'an unknown response type'} (HTTP ${response.status}) instead of JSON.`
    );
  }

  try {
    return body ? JSON.parse(body) as ApiResponseBody : {};
  } catch {
    throw new Error(`The server returned malformed JSON (HTTP ${response.status}).`);
  }
}
