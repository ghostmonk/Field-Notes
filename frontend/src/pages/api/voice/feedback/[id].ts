import { NextApiRequest, NextApiResponse } from 'next';
import { apiLogger } from '@/shared/utils/logger';
import { getAccessToken, getBackendUrl } from '@/shared/utils/backend-fetch';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!['PUT', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  apiLogger.logApiRequest(req, res);

  try {
    const accessToken = await getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    const url = new URL(`${getBackendUrl()}/voice/feedback/${id}`);
    if (req.method === 'PUT' && req.query.feedback_type) {
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
    });

    if (response.status === 204) {
      return res.status(204).end();
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch {
      data = { detail: `Error: ${response.statusText}` };
    }
    return res.status(response.status).json(data);
  } catch (error) {
    apiLogger.error(
      'Fatal error in /api/voice/feedback/[id]',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
