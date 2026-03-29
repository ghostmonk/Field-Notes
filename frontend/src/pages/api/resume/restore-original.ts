import { NextApiRequest, NextApiResponse } from 'next';
import { apiLogger } from '@/shared/utils/logger';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';
import { invalidatePdfCache } from './download-pdf';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  apiLogger.logApiRequest(req, res);

  try {
    const accessToken = await getAccessToken(req);
    if (!accessToken) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    const response = await fetchBackend('/resume/restore-original', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    if (response.ok) invalidatePdfCache();
    return res.status(response.status).json(data);
  } catch (error) {
    apiLogger.error(
      'Fatal error in /api/resume/restore-original',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
