import { NextApiRequest, NextApiResponse } from 'next';
import { apiLogger } from '@/shared/utils/logger';
import { fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    const response = await fetchBackend('/resume/public');

    if (!response.ok) {
      let errorData: Record<string, unknown>;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: 'Unknown error' };
      }
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=600'
    );
    return res.status(200).json(data);
  } catch (error) {
    apiLogger.error('Fatal error in /api/resume/public', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      detail:
        error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
