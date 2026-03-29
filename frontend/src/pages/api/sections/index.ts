import { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken, getBackendUrl, fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const accessToken = await getAccessToken(req);
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        if (req.method === 'GET') {
            const url = new URL(`${getBackendUrl()}/sections`);
            for (const [key, value] of Object.entries(req.query)) {
                if (typeof value === 'string') {
                    url.searchParams.set(key, value);
                }
            }

            const response = await fetch(url.toString(), {
                headers,
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                return res.status(response.status).json(errorData);
            }

            const data = await response.json();
            return res.status(200).json(data);
        } else if (req.method === 'POST') {
            if (!accessToken) {
                return res.status(401).json({ detail: 'Authentication required', error: 'Unauthorized' });
            }

            const response = await fetchBackend('/sections', {
                method: 'POST',
                headers,
                body: JSON.stringify(req.body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                return res.status(response.status).json({
                    detail: errorData.detail || `Error: ${response.statusText}`,
                    status: response.status
                });
            }

            const data = await response.json();
            return res.status(201).json(data);
        } else {
            return res.status(405).json({ detail: 'Method not allowed', error: 'Invalid request' });
        }
    } catch (error) {
        console.error('Error in /api/sections:', error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
