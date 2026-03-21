import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { apiLogger } from '@/shared/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const API_BASE_URL =
    process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!['GET', 'POST'].includes(req.method || '')) {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  if (!API_BASE_URL) {
    return res.status(500).json({ detail: 'Backend URL not configured' });
  }

  apiLogger.logApiRequest(req, res);

  try {
    const token = await getToken({ req });

    if (!token || !token.accessToken) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    const url = new URL(`${API_BASE_URL}/applications`);
    if (req.method === 'GET' && req.query.status) {
      url.searchParams.set('status', req.query.status as string);
    }

    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
      ...(req.method === 'POST' && { body: JSON.stringify(req.body) }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    apiLogger.error(
      'Fatal error in /api/applications',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
