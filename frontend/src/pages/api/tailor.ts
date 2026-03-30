import { NextApiRequest, NextApiResponse } from 'next';
import { apiLogger } from '@/shared/utils/logger';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';
import { invalidatePdfCache } from './resume/download-pdf';

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
      return res.status(401).json({
        detail: 'Not authenticated',
        error: 'Authentication required',
      });
    }

    // LLM pipeline takes 30-60s+; override fetchBackend's 10s default
    const response = await fetchBackend('/tailor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      let errorData: Record<string, unknown>;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: 'Unknown error' };
      }

      return res.status(response.status).json({
        detail: errorData.detail || `Error: ${response.statusText}`,
        status: response.status,
        error: errorData,
      });
    }

    const data = await response.json();
    invalidatePdfCache();
    return res.status(200).json(data);
  } catch (error) {
    apiLogger.error(
      'Fatal error in /api/tailor',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({
      detail: 'Internal server error',
      error: 'Failed to process request',
    });
  }
}
