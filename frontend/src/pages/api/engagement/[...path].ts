import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { apiLogger } from '@/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!API_BASE_URL) {
        const error = new Error('Backend URL not configured');
        apiLogger.error('Configuration error', error, {
            detail: 'Set BACKEND_URL or NEXT_PUBLIC_API_URL'
        });
        return res.status(500).json({
            detail: 'Backend URL not configured. Set BACKEND_URL or NEXT_PUBLIC_API_URL',
            error: 'Configuration error'
        });
    }

    const { path } = req.query;
    const pathArray = Array.isArray(path) ? path : [path];
    const backendPath = `/api/engagement/${pathArray.join('/')}`;

    apiLogger.logApiRequest(req, res);

    try {
        const token = await getToken({ req });

        // Allow public read endpoints without auth
        const isPublicEndpoint = pathArray.join('/') === 'bulk/counts';

        // Require authentication for mutation operations (except public read endpoints)
        if (req.method !== 'GET' && !isPublicEndpoint && (!token || !token.accessToken)) {
            return res.status(401).json({
                detail: 'Not authenticated',
                error: 'Authentication required'
            });
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token?.accessToken) {
            headers.Authorization = `Bearer ${token.accessToken}`;
        }

        const apiUrl = `${API_BASE_URL}${backendPath}`;

        // Forward query parameters for GET requests
        let finalUrl = apiUrl;
        if (req.method === 'GET' && req.url) {
            const urlObj = new URL(req.url, `http://localhost`);
            const queryString = urlObj.search;
            if (queryString) {
                finalUrl = `${apiUrl}${queryString}`;
            }
        }

        const response = await fetch(finalUrl, {
            method: req.method,
            headers,
            ...(req.method !== 'GET' && req.method !== 'DELETE' && req.body && {
                body: JSON.stringify(req.body)
            }),
        });

        // Handle 204 No Content
        if (response.status === 204) {
            return res.status(204).end();
        }

        // Handle errors
        if (!response.ok) {
            let errorData: any;
            try {
                errorData = await response.json();
            } catch {
                errorData = { detail: 'Unknown error' };
            }

            return res.status(response.status).json({
                detail: errorData.detail || `Error: ${response.statusText}`,
                status: response.status,
                error: errorData
            });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error(`Fatal error in /api/engagement/${pathArray.join('/')}:`, error);
        apiLogger.error(`API proxy error`, error instanceof Error ? error : undefined, {
            path: backendPath
        });

        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
