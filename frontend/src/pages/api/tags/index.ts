import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const params = new URLSearchParams();
    if (req.query.q) params.append('q', req.query.q.toString());
    if (req.query.limit) params.append('limit', req.query.limit.toString());
    if (req.query.offset) params.append('offset', req.query.offset.toString());

    const qs = params.toString();
    const path = qs ? `/tags?${qs}` : '/tags';

    try {
      const response = await fetchBackend(path);
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in GET /api/tags:', error);
      return res.status(500).json({
        detail: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  if (req.method === 'POST') {
    const token = await getToken({ req });
    const accessToken = token?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
      return res.status(401).json({ detail: 'Authentication required' });
    }

    try {
      const response = await fetchBackend('/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      if (!response.ok) return res.status(response.status).json(data);
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('Error in POST /api/tags:', error);
      return res.status(500).json({
        detail: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  return res.status(405).json({ detail: 'Method not allowed' });
}
