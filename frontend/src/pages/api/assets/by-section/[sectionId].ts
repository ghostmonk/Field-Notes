import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';

function firstString(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return res.status(401).json({ detail: 'Authentication required' });
  }

  const sectionId = firstString(req.query.sectionId);
  if (!sectionId || !/^[a-f0-9]{24}$/.test(sectionId)) {
    return res.status(400).json({ detail: 'Invalid sectionId' });
  }

  const params = new URLSearchParams();
  const limit = firstString(req.query.limit);
  const cursor = firstString(req.query.cursor);
  if (limit) params.append('limit', limit);
  if (cursor) params.append('cursor', cursor);

  const qs = params.toString();
  const path = qs
    ? `/assets/by-section/${sectionId}?${qs}`
    : `/assets/by-section/${sectionId}`;

  try {
    const response = await fetchBackend(path, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);
  } catch (error) {
    console.error(`Error in GET /api/assets/by-section/${sectionId}:`, error);
    return res.status(500).json({
      detail: 'Internal server error',
    });
  }
}
