import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { apiLogger } from '@/utils/logger';

// Simple in-memory cache for projects
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(req: NextApiRequest): string {
    const { limit, offset, featured_only } = req.query;
    return `projects:${limit || 'all'}:${offset || 0}:${featured_only || 'false'}`;
}

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

    if (!API_BASE_URL) {
        return res.status(500).json({
            detail: 'Backend URL not configured',
            error: 'Configuration error'
        });
    }

    apiLogger.logApiRequest(req, res);

    try {
        // Check cache for GET requests
        if (req.method === 'GET') {
            const cacheKey = getCacheKey(req);
            const cachedData = getFromCache(cacheKey);

            if (cachedData) {
                apiLogger.info('Serving projects from cache', { cacheKey });
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

            invalidateCache('projects');
        }

        let apiUrl = `${API_BASE_URL}/projects`;
        const token = await getToken({ req });

        // Build query params for GET
        if (req.method === 'GET' && req.query) {
            const params = new URLSearchParams();

            if (req.query.limit) {
                params.append('limit', req.query.limit.toString());
            }
            if (req.query.offset) {
                params.append('offset', req.query.offset.toString());
            }
            if (req.query.featured_only === 'true') {
                params.append('featured_only', 'true');
            }
            if (token?.accessToken) {
                params.append('include_unpublished', 'true');
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

        const response = await fetch(apiUrl, {
            method: req.method,
            headers,
            ...(req.method !== 'GET' && { body: JSON.stringify(req.body) }),
        });

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

        // Cache successful GET responses
        if (req.method === 'GET') {
            const cacheKey = getCacheKey(req);
            setCache(cacheKey, data, CACHE_TTL);
            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
            res.setHeader('X-Cache', 'MISS');
        }

        // Return 201 for POST
        const statusCode = req.method === 'POST' ? 201 : 200;
        return res.status(statusCode).json(data);
    } catch (error) {
        console.error('Fatal error in /api/projects:', error);

        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
