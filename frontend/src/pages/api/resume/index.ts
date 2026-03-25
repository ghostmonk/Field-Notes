import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { apiLogger } from '@/shared/utils/logger';
import { fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  apiLogger.logApiRequest(req, res);

  try {
    const token = await getToken({ req });

    if (!token || !token.accessToken) {
      return res.status(401).json({
        detail: 'Not authenticated',
        error: 'Authentication required',
      });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.accessToken}`,
    };

    const response = await fetchBackend('/resume', {
      method: req.method,
      headers,
      ...(req.method !== 'GET' &&
        req.method !== 'DELETE' && { body: JSON.stringify(req.body) }),
    });

    if (response.status === 204) {
      return res.status(204).end();
    }

    if (!response.ok) {
      let errorData: Record<string, unknown>;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: 'Unknown error' };
      }

      return res.status(response.status).json({
        detail: errorData.detail || `Error: ${response.statusText}`,
        status: response.status,
        error: errorData,
      });
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    apiLogger.error('Fatal error in /api/resume', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      detail:
        error instanceof Error ? error.message : 'Internal server error',
      error: 'Failed to process request',
    });
  }
}
