/**
 * Shared in-memory cache for photo essay API routes.
 *
 * Both /api/photo-essays (list) and /api/photo-essays/[id] (mutations)
 * import from here so that mutations can invalidate the list cache.
 *
 * Limitation: This is a process-scoped Map. On Cloud Run with multiple
 * instances, a mutation on instance A will not invalidate instance B's
 * cache. The TTL (5 min) provides eventual consistency.
 */

const cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getListCacheKey(
    query: { limit?: string | string[]; offset?: string | string[]; section_id?: string | string[] }
): string {
    const { limit, offset, section_id } = query;
    return `photo-essays:${limit || 'all'}:${offset || 0}:${section_id || 'none'}`;
}

export function getDetailCacheKey(id: string): string {
    return `photo-essay:${id}`;
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

export function invalidatePhotoEssayCache(): void {
    cache.clear();
}
