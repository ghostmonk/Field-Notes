import { NextApiRequest, NextApiResponse } from 'next';
import { apiLogger } from '@/shared/utils/logger';
import { getAccessToken, getBackendUrl } from '@/shared/utils/backend-fetch';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!['GET', 'POST'].includes(req.method || '')) {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  apiLogger.logApiRequest(req, res);

  try {
    const accessToken = await getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    const url = new URL(`${getBackendUrl()}/voice/feedback`);
    if (req.method === 'GET' && req.query.feedback_type) {
      url.searchParams.set(
        'feedback_type',
        req.query.feedback_type as string
      );
    }

    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10000),
      ...(req.method === 'POST' && { body: JSON.stringify(req.body) }),
    });

    if (!response.ok) {
      let errorData: Record<string, unknown>;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: 'Unknown error' };
      }
      return res.status(response.status).json({
        detail: errorData.detail || `Error: ${response.statusText}`,
      });
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    apiLogger.error(
      'Fatal error in /api/voice/feedback',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({
      detail: 'Internal server error',
    });
  }
}
