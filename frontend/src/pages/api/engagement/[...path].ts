import { NextApiRequest, NextApiResponse } from 'next';
import { apiLogger } from '@/shared/utils/logger';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { path } = req.query;
    const pathArray = Array.isArray(path) ? path : [path];
    const backendPath = `/api/engagement/${pathArray.join('/')}`;

    apiLogger.logApiRequest(req, res);

    try {
        const accessToken = await getAccessToken(req);

        // GET requests are always public (reactions/comments viewing)
        // POST to bulk/counts is also public (read-only operation using POST for request body)
        const isPublicPostEndpoint = pathArray.join('/') === 'bulk/counts';

        // Require authentication for mutation operations only
        if (req.method !== 'GET' && !isPublicPostEndpoint && !accessToken) {
            return res.status(401).json({
                detail: 'Not authenticated',
                error: 'Authentication required'
            });
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        // Forward query parameters for GET requests
        let finalPath = backendPath;
        if (req.method === 'GET' && req.url) {
            const urlObj = new URL(req.url, 'http://localhost');
            const queryString = urlObj.search;
            if (queryString) {
                finalPath = `${backendPath}${queryString}`;
            }
        }

        const response = await fetchBackend(finalPath, {
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
