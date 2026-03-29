import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const pathSegments = req.query.path;
    const fullPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

    if (!fullPath) {
        return res.status(400).json({ detail: 'Path is required' });
    }

    try {
        const accessToken = await getAccessToken(req);
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetchBackend(`/sections/resolve-path/${fullPath}`, {
            method: 'GET',
            headers,
            redirect: 'manual',
        });

        if (response.status === 301) {
            const location = response.headers.get('location');
            return res.redirect(301, location || '/');
        }

        if (response.status === 404) {
            return res.status(404).json({ detail: 'Path not found' });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch {
        return res.status(500).json({ detail: 'Internal server error' });
    }
}
