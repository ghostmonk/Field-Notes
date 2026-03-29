import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ detail: 'Tag ID is required' });
  }

  if (req.method === 'DELETE') {
    const token = await getToken({ req });
    const accessToken = token?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
      return res.status(401).json({ detail: 'Authentication required' });
    }

    try {
      const response = await fetchBackend(`/tags/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return res.status(response.status).json(data);
      }

      return res.status(204).end();
    } catch (error) {
      console.error(`Error in DELETE /api/tags/${name}:`, error);
      return res.status(500).json({
        detail: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  return res.status(405).json({ detail: 'Method not allowed' });
}
