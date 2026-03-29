import { NextApiRequest, NextApiResponse } from "next";
import { apiLogger } from '@/shared/utils/logger';
import {
    CACHE_TTL,
    getDetailCacheKey,
    getFromCache,
    setCache,
    invalidatePhotoEssayCache,
} from '@/shared/lib/photo-essay-cache';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({
            detail: 'Photo essay ID is required',
            error: 'Validation error'
        });
    }

    apiLogger.logApiRequest(req, res);

    try {
        const accessToken = await getAccessToken(req);

        // Check cache for GET requests
        if (req.method === 'GET') {
            const cacheKey = getDetailCacheKey(id);
            const cachedData = getFromCache(cacheKey);

            if (cachedData) {
                apiLogger.info('Serving photo essay from cache', { cacheKey });
                res.setHeader('Cache-Control', 'private, no-store');
                res.setHeader('X-Cache', 'HIT');
                return res.status(200).json(cachedData);
            }
        }

        // Require auth for mutations
        if (req.method !== 'GET') {
            if (!accessToken) {
                return res.status(401).json({
                    detail: 'Not authenticated',
                    error: 'Authentication required'
                });
            }

            invalidatePhotoEssayCache();
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetchBackend(`/photo-essays/${id}`, {
            method: req.method,
            headers,
            ...(req.method !== 'GET' && req.method !== 'DELETE' && { body: JSON.stringify(req.body) }),
        });

        // Handle 404
        if (response.status === 404) {
            return res.status(404).json({
                detail: `Photo essay "${id}" not found`,
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
            const cacheKey = getDetailCacheKey(id);
            setCache(cacheKey, data, CACHE_TTL);
            res.setHeader('Cache-Control', 'private, no-store');
            res.setHeader('X-Cache', 'MISS');
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error(`Fatal error in /api/photo-essays/${id}:`, error);

        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
