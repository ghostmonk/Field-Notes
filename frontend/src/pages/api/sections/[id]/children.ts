import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id, ...queryParams } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ detail: 'Section ID is required' });
    }

    try {
        const accessToken = await getAccessToken(req);
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        const params = new URLSearchParams();
        for (const [key, val] of Object.entries(queryParams)) {
            if (val) params.set(key, String(val));
        }

        const queryString = params.toString();
        const url = `/sections/${id}/children${queryString ? `?${queryString}` : ''}`;
        const response = await fetchBackend(url, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch {
        return res.status(500).json({ detail: 'Internal server error' });
    }
}
