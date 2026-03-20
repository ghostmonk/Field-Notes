import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const API_BASE_URL =
    process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!API_BASE_URL) {
    return res.status(500).json({ detail: 'Backend URL not configured' });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/resume/public`);

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
    console.error('Fatal error in /api/resume/public:', error);
    return res.status(500).json({
      detail:
        error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
