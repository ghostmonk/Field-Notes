import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { apiLogger } from '@/shared/utils/logger';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  apiLogger.logApiRequest(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }

    const response = await fetch(`${backendUrl}/uploads/filter-previews`, {
      method: 'POST',
      headers: {
        ...req.headers as Record<string, string>,
        'Authorization': `Bearer ${session.accessToken}`,
      },
      // @ts-ignore - Stream the body
      body: req,
      duplex: 'half',
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: unknown) {
    const e = error instanceof Error ? error : new Error(String(error));
    apiLogger.error('Filter preview proxy error', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
