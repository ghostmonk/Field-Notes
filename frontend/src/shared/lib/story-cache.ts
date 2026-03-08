/**
 * Shared in-memory cache for story API routes.
 *
 * Both /api/stories (list) and /api/stories/[id] (mutations)
 * import from here so that mutations can invalidate the list cache.
 *
 * Limitation: This is a process-scoped Map. On Cloud Run with multiple
 * instances, a mutation on instance A will not invalidate instance B's
 * cache. The TTL (2-5 min) provides eventual consistency.
 */

const cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

export const CACHE_TTL = 2 * 60 * 1000; // 2 minutes for authenticated
export const PUBLIC_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for public

export function getCacheKey(
    isAuthenticated: boolean,
    query: { limit?: string | string[]; offset?: string | string[]; section_id?: string | string[] }
): string {
    const { limit, offset, section_id } = query;
    return `stories:${isAuthenticated ? 'auth' : 'anon'}:${limit || 'all'}:${offset || 0}:${section_id || 'none'}`;
}

export function getFromCache(key: string): unknown | null {
    const cached = cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
        cache.delete(key);
        return null;
    }

    return cached.data;
}

export function setCache(key: string, data: unknown, ttl: number): void {
    cache.set(key, { data, timestamp: Date.now(), ttl });
}

export function invalidateStoryCache(): void {
    cache.clear();
}
