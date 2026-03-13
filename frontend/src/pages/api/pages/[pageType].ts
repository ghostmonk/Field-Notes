import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { apiLogger } from '@/shared/utils/logger';

// Simple in-memory cache for pages
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for pages

function getFromCache(key: string): any | null {
    const cached = cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
        cache.delete(key);
        return null;
    }

    return cached.data;
}

function setCache(key: string, data: any, ttl: number): void {
    cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
    });
}

function invalidateCache(pattern?: string): void {
    if (!pattern) {
        cache.clear();
        return;
    }

    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    const { pageType } = req.query;

    if (!API_BASE_URL) {
        const error = new Error('Backend URL not configured');
        apiLogger.error('Configuration error', error, {
            detail: 'Set BACKEND_URL or NEXT_PUBLIC_API_URL'
        });
        return res.status(500).json({
            detail: 'Backend URL not configured',
            error: 'Configuration error'
        });
    }

    apiLogger.logApiRequest(req, res);

    try {
        // Check cache for GET requests
        if (req.method === 'GET') {
            const cacheKey = `page:${pageType}`;
            const cachedData = getFromCache(cacheKey);

            if (cachedData) {
                apiLogger.info('Serving page from cache', { cacheKey });
                res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
                res.setHeader('X-Cache', 'HIT');
                return res.status(200).json(cachedData);
            }
        }

        // Require auth for mutations
        if (req.method !== 'GET') {
            const token = await getToken({ req });

            if (!token || !token.accessToken) {
                return res.status(401).json({
                    detail: 'Not authenticated',
                    error: 'Authentication required'
                });
            }

            // Invalidate cache on mutations
            invalidateCache(`page:${pageType}`);
        }

        const apiUrl = `${API_BASE_URL}/pages/${pageType}`;
        const token = await getToken({ req });

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token?.accessToken) {
            headers.Authorization = `Bearer ${token.accessToken}`;
        }

        const response = await fetch(apiUrl, {
            method: req.method,
            headers,
            ...(req.method !== 'GET' && { body: JSON.stringify(req.body) }),
        });

        // Handle 404 gracefully for pages that don't exist yet
        if (response.status === 404 && req.method === 'GET') {
            return res.status(404).json({
                detail: `Page "${pageType}" not found`,
                error: 'Not found'
            });
        }

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

        // Handle 204 No Content for DELETE
        if (response.status === 204) {
            return res.status(204).end();
        }

        const data = await response.json();

        // Cache successful GET responses
        if (req.method === 'GET') {
            const cacheKey = `page:${pageType}`;
            setCache(cacheKey, data, CACHE_TTL);
            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
            res.setHeader('X-Cache', 'MISS');
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error(`Fatal error in /api/pages/${pageType}:`, error);

        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
