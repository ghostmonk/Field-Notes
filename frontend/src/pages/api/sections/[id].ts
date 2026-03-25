import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ detail: 'Section ID is required', error: 'Invalid request' });
    }

    try {
        const token = await getToken({ req });
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token?.accessToken) {
            headers.Authorization = `Bearer ${token.accessToken}`;
        }

        if (req.method === 'GET') {
            const response = await fetchBackend(`/sections/${id}`, { headers });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                return res.status(response.status).json(errorData);
            }

            const data = await response.json();
            return res.status(200).json(data);
        } else if (req.method === 'PUT') {
            if (!token?.accessToken) {
                return res.status(401).json({ detail: 'Authentication required', error: 'Unauthorized' });
            }

            const response = await fetchBackend(`/sections/${id}`, {
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
            return res.status(200).json(data);
        } else if (req.method === 'DELETE') {
            if (!token?.accessToken) {
                return res.status(401).json({ detail: 'Authentication required', error: 'Unauthorized' });
            }

            const response = await fetchBackend(`/sections/${id}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                return res.status(response.status).json({
                    detail: errorData.detail || `Error: ${response.statusText}`,
                    status: response.status
                });
            }

            return res.status(204).end();
        } else {
            return res.status(405).json({ detail: 'Method not allowed', error: 'Invalid request' });
        }
    } catch (error) {
        console.error(`Error in /api/sections/${id}:`, error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
