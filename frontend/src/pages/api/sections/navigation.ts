import { NextApiRequest, NextApiResponse } from "next";
import { fetchBackend } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    try {
        const response = await fetchBackend('/sections?nav_visibility=main');

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching navigation sections:', error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
