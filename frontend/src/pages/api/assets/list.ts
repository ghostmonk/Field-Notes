import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return res.status(401).json({ detail: 'Authentication required' });
  }

  const params = new URLSearchParams();
  if (req.query.prefix) params.append('prefix', req.query.prefix.toString());
  if (req.query.limit) params.append('limit', req.query.limit.toString());
  if (req.query.cursor) params.append('cursor', req.query.cursor.toString());

  const qs = params.toString();
  const path = qs ? `/assets/list?${qs}` : '/assets/list';

  try {
    const response = await fetchBackend(path, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in GET /api/assets/list:', error);
    return res.status(500).json({
      detail: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
