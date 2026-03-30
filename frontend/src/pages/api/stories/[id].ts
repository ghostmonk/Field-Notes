import { NextApiRequest, NextApiResponse } from 'next';
import { invalidateStoryCache } from '@/shared/lib/story-cache';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ detail: 'Story ID is required', error: 'Invalid request' });
    }

    try {
        const accessToken = await getAccessToken(req);
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const backendPath = isObjectId ? `/stories/${id}` : `/stories/slug/${id}`;

        if (req.method === 'DELETE') {
            if (!accessToken) {
                return res.status(401).json({ detail: 'Authentication required', error: 'Unauthorized' });
            }

            if (!isObjectId) {
                return res.status(400).json({ detail: 'Cannot delete by slug, ID required', error: 'Invalid request' });
            }

            const response = await fetchBackend(backendPath, { method: 'DELETE', headers });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                return res.status(response.status).json({
                    detail: errorData.detail || `Error: ${response.statusText}`,
                    status: response.status
                });
            }

            invalidateStoryCache();
            try { await res.revalidate('/'); } catch { /* non-fatal */ }
            return res.status(204).end();
        } else if (req.method === 'PUT') {
            if (!accessToken) {
                return res.status(401).json({ detail: 'Authentication required', error: 'Unauthorized' });
            }

            if (!isObjectId) {
                return res.status(400).json({ detail: 'Cannot update by slug, ID required', error: 'Invalid request' });
            }

            const response = await fetchBackend(backendPath, {
                method: 'PUT',
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
            invalidateStoryCache();
            try { await res.revalidate('/'); } catch { /* non-fatal */ }
            return res.status(200).json(data);
        } else if (req.method === 'GET') {
            const response = await fetchBackend(backendPath, { headers });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                return res.status(response.status).json({
                    detail: errorData.detail || `Error: ${response.statusText}`,
                    status: response.status
                });
            }

            const data = await response.json();
            return res.status(200).json(data);
        } else {
            return res.status(405).json({ detail: 'Method not allowed', error: 'Invalid request' });
        }
    } catch (error) {
        console.error(`Error in /api/stories/${id}:`, error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
