import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { invalidateStoryCache } from '@/shared/lib/story-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Use BACKEND_URL for server-to-server communication (in Docker)
    // Fall back to NEXT_PUBLIC_API_URL if BACKEND_URL is not available
    const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    
    if (!API_BASE_URL) {
        return res.status(500).json({ 
            detail: 'Backend URL not configured. Set BACKEND_URL or NEXT_PUBLIC_API_URL',
            error: 'Configuration error'
        });
    }
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ detail: 'Story ID is required', error: 'Invalid request' });
    }
    
    try {
        const token = await getToken({ req });
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        if (token?.accessToken) {
            headers.Authorization = `Bearer ${token.accessToken}`;
        }
        
        // Check if the ID is a MongoDB ObjectID or a slug
        // MongoDB ObjectIDs are 24 hex characters
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        
        let apiUrl: string;
        if (isObjectId) {
            apiUrl = `${API_BASE_URL}/stories/${id}`;
        } else {
            // Treat as a slug
            apiUrl = `${API_BASE_URL}/stories/slug/${id}`;
        }
        
        if (req.method === 'DELETE') {
            if (!token?.accessToken) {
                return res.status(401).json({ detail: 'Authentication required', error: 'Unauthorized' });
            }

            // Only allow deletion by ID, not by slug
            if (!isObjectId) {
                return res.status(400).json({ detail: 'Cannot delete by slug, ID required', error: 'Invalid request' });
            }

            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                return res.status(response.status).json({
                    detail: errorData.detail || `Error: ${response.statusText}`,
                    status: response.status
                });
            }

            invalidateStoryCache();
            try { await res.revalidate('/'); } catch { /* non-fatal */ }
            return res.status(204).end();
        } else if (req.method === 'PUT') {
            if (!token?.accessToken) {
                return res.status(401).json({ detail: 'Authentication required', error: 'Unauthorized' });
            }

            // Only allow updates by ID, not by slug
            if (!isObjectId) {
                return res.status(400).json({ detail: 'Cannot update by slug, ID required', error: 'Invalid request' });
            }

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify(req.body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                return res.status(response.status).json({
                    detail: errorData.detail || `Error: ${response.statusText}`,
                    status: response.status
                });
            }

            const data = await response.json();
            invalidateStoryCache();
            try { await res.revalidate('/'); } catch { /* non-fatal */ }
            return res.status(200).json(data);
        } else if (req.method === 'GET') {
            const response = await fetch(apiUrl, { headers });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                return res.status(response.status).json({
                    detail: errorData.detail || `Error: ${response.statusText}`,
                    status: response.status
                });
            }
            
            const data = await response.json();
            return res.status(200).json(data);
        } else {
            return res.status(405).json({ detail: 'Method not allowed', error: 'Invalid request' });
        }
    } catch (error) {
        console.error(`Error in /api/stories/${id}:`, error);
        return res.status(500).json({ 
            detail: error instanceof Error ? error.message : 'Internal server error',
            error: 'Failed to process request'
        });
    }
}
