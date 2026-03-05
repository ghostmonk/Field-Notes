import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { apiLogger } from '@/shared/utils/logger';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    const { slug } = req.query;

    if (!API_BASE_URL) {
        return res.status(500).json({
            detail: 'Backend URL not configured',
            error: 'Configuration error'
        });
    }

    if (!slug || typeof slug !== 'string') {
        return res.status(400).json({
            detail: 'Project slug is required',
            error: 'Validation error'
        });
    }

    apiLogger.logApiRequest(req, res);

    try {
        const token = await getToken({ req });

        // Check cache for GET requests
        if (req.method === 'GET') {
            const cacheKey = `project:${slug}`;
            const cachedData = getFromCache(cacheKey);

            if (cachedData) {
                apiLogger.info('Serving project from cache', { cacheKey });
                res.setHeader('Cache-Control', 'private, no-store');
                res.setHeader('X-Cache', 'HIT');
                return res.status(200).json(cachedData);
            }
        }

        // Require auth for mutations
        if (req.method !== 'GET') {
            if (!token || !token.accessToken) {
                return res.status(401).json({
                    detail: 'Not authenticated',
                    error: 'Authentication required'
                });
            }

            invalidateCache('project');
        }

        // Determine the endpoint based on request method
        // GET uses slug endpoint, PUT/DELETE use ID endpoint
        let apiUrl: string;
        if (req.method === 'GET') {
            apiUrl = `${API_BASE_URL}/projects/slug/${slug}`;
        } else {
            // For PUT/DELETE, slug is actually the project ID
            apiUrl = `${API_BASE_URL}/projects/${slug}`;
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
            ...(req.method !== 'GET' && req.method !== 'DELETE' && { body: JSON.stringify(req.body) }),
        });

        // Handle 404
        if (response.status === 404) {
            return res.status(404).json({
                detail: `Project "${slug}" not found`,
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
            const cacheKey = `project:${slug}`;
            setCache(cacheKey, data, CACHE_TTL);
            res.setHeader('Cache-Control', 'private, no-store');
            res.setHeader('X-Cache', 'MISS');
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error(`Fatal error in /api/projects/${slug}:`, error);

        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
