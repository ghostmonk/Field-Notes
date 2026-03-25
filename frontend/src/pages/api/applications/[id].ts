import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { apiLogger } from '@/shared/utils/logger';
import { fetchBackend } from '@/shared/utils/backend-fetch';

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
    const token = await getToken({ req });

    if (!token || !token.accessToken) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    const response = await fetchBackend(`/applications/${id}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
      ...(req.method === 'PUT' && { body: JSON.stringify(req.body) }),
    });

    if (response.status === 204) {
      return res.status(204).end();
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    apiLogger.error(
      'Fatal error in /api/applications/[id]',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
