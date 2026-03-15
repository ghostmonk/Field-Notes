import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl) {
    return res.status(500).json({ error: 'Backend URL not configured' });
  }

  try {
    const response = await fetch(`${backendUrl}/github/contributions`);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('GitHub contributions proxy error:', error);
    return res.status(502).json({ error: 'Failed to fetch contributions' });
  }
}
