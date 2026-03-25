import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetchBackend('/github/contributions');
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('GitHub contributions proxy error:', error);
    return res.status(502).json({ error: 'Failed to fetch contributions' });
  }
}
