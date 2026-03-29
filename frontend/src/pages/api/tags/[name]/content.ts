import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const { name } = req.query;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ detail: 'Tag name is required' });
  }

  try {
    const response = await fetchBackend(`/tags/${encodeURIComponent(name)}/content`);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);
  } catch (error) {
    console.error(`Error in GET /api/tags/${name}/content:`, error);
    return res.status(500).json({
      detail: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
