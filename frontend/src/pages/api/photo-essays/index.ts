import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { apiLogger } from '@/shared/utils/logger';
import {
    CACHE_TTL,
    getListCacheKey,
    getFromCache,
    setCache,
    invalidatePhotoEssayCache,
} from '@/shared/lib/photo-essay-cache';

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
        const token = await getToken({ req });

        // Check cache for GET requests
        if (req.method === 'GET') {
            const cacheKey = getListCacheKey(req.query);
            const cachedData = getFromCache(cacheKey);

            if (cachedData) {
                apiLogger.info('Serving photo essays from cache', { cacheKey });
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

            invalidatePhotoEssayCache();
        }

        // Build URL — GET lists use /photo-essays/section/{section_id}
        let apiUrl: string;
        if (req.method === 'GET' && req.query.section_id) {
            apiUrl = `${API_BASE_URL}/photo-essays/section/${req.query.section_id}`;
            const params = new URLSearchParams();

            if (req.query.limit) {
                params.append('limit', req.query.limit.toString());
            }
            if (req.query.offset) {
                params.append('offset', req.query.offset.toString());
            }
            if (token?.accessToken) {
                params.append('include_unpublished', 'true');
            }

            if (params.toString()) {
                apiUrl += `?${params.toString()}`;
            }
        } else if (req.method === 'GET') {
            return res.status(400).json({
                detail: 'section_id query parameter is required',
                error: 'Missing required parameter'
            });
        } else {
            apiUrl = `${API_BASE_URL}/photo-essays`;
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
            const cacheKey = getListCacheKey(req.query);
            setCache(cacheKey, data, CACHE_TTL);
            res.setHeader('Cache-Control', 'private, no-store');
            res.setHeader('X-Cache', 'MISS');
        }

        // Return 201 for POST
        const statusCode = req.method === 'POST' ? 201 : 200;
        return res.status(statusCode).json(data);
    } catch (error) {
        console.error('Fatal error in /api/photo-essays:', error);

        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
