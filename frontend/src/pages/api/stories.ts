import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { apiLogger } from '@/shared/utils/logger';
import {
    CACHE_TTL,
    PUBLIC_CACHE_TTL,
    getCacheKey,
    getFromCache,
    setCache,
    invalidateStoryCache,
} from '@/shared/lib/story-cache';
import { getBackendUrl } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Start logging the request
    apiLogger.logApiRequest(req, res);

    try {
        const token = await getToken({ req });
        const isAuthenticated = !!token?.accessToken;

        // No browser caching — the server-side in-memory cache handles
        // performance. Browser caching causes stale responses to overwrite
        // fresh server-rendered data on client-side mount fetches.
        const cacheControl = 'private, no-store';

        // Check cache for GET requests
        if (req.method === 'GET') {
            const cacheKey = getCacheKey(isAuthenticated, req.query);
            const cachedData = getFromCache(cacheKey);

            if (cachedData) {
                apiLogger.info('Serving from cache', { cacheKey });

                res.setHeader('Cache-Control', cacheControl);
                res.setHeader('X-Cache', 'HIT');

                return res.status(200).json(cachedData);
            }
        }

        if (req.method !== 'GET') {
            if (!isAuthenticated) {
                const error = new Error('Authentication required');
                apiLogger.error('Authentication failed', error, {
                    path: req.url,
                    method: req.method
                });
                return res.status(401).json({
                    detail: 'Not authenticated',
                    error: 'Authentication required'
                });
            }

            // Invalidate cache on mutations
            invalidateStoryCache();
        }

        const backendUrl = getBackendUrl();
        let apiUrl = `${backendUrl}/stories`;

        if (req.method === 'GET' && req.query) {
            const params = new URLSearchParams();

            if (req.query.limit) {
                params.append('limit', req.query.limit.toString());
            }

            if (req.query.offset) {
                params.append('offset', req.query.offset.toString());
            }

            if (req.query.section_id) {
                params.append('section_id', req.query.section_id.toString());
            }

            if (token?.accessToken) {
                params.append('include_drafts', 'true');
            }

            if (params.toString()) {
                apiUrl += `?${params.toString()}`;
            }
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token?.accessToken) {
            headers.Authorization = `Bearer ${token.accessToken}`;
        }

        const requestBody = req.method !== 'GET' ? req.body : undefined;
        console.log(`Backend request: ${req.method} ${apiUrl}`, {
            method: req.method,
            hasToken: !!token?.accessToken,
            bodyPreview: requestBody ? JSON.stringify(requestBody).substring(0, 150) + '...' : undefined
        });

        const response = await fetch(apiUrl, {
            method: req.method,
            headers,
            signal: AbortSignal.timeout(10000),
            ...(req.method !== 'GET' && { body: JSON.stringify(req.body) }),
        });

        if (!response.ok) {
            let errorData: any;
            let responseText: string | undefined;

            try {
                errorData = await response.json();
            } catch (_parseError) {
                try {
                    responseText = await response.text();
                    errorData = { detail: 'Non-JSON error response', rawResponse: responseText };
                } catch (_textError) {
                    errorData = { detail: 'Unable to read error response' };
                }
            }

            console.error('Backend API error:', {
                status: response.status,
                statusText: response.statusText,
                url: apiUrl,
                errorData,
                responseText: responseText?.substring(0, 500),
                headers: Object.fromEntries(response.headers.entries())
            });

            return res.status(response.status).json({
                detail: errorData.detail || `Error: ${response.statusText}`,
                status: response.status,
                error: errorData,
                url: apiUrl
            });
        }

        const data = await response.json();

        // Revalidate home page ISR cache after mutations
        if (req.method !== 'GET') {
            try {
                await res.revalidate('/');
            } catch (revalidateErr) {
                console.error('ISR revalidation failed:', revalidateErr);
            }
        }

        // Cache successful GET responses
        if (req.method === 'GET') {
            const cacheKey = getCacheKey(isAuthenticated, req.query);
            const ttl = isAuthenticated ? CACHE_TTL : PUBLIC_CACHE_TTL;

            setCache(cacheKey, data, ttl);
            apiLogger.info('Cached response', { cacheKey, ttl });

            res.setHeader('Cache-Control', cacheControl);
            res.setHeader('X-Cache', 'MISS');
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Fatal error in /api/stories:', error);

        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }

        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request',
            stack: error instanceof Error ? error.stack : undefined
        });
    }
}
