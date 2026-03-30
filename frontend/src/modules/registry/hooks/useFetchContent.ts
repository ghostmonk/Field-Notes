import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { PaginatedResponse } from '@/shared/types/api';
import type { ContentType } from '../types';

const PAGE_SIZE = 10;

export interface UseFetchContentOptions<T> {
    contentType: ContentType;
    sectionId?: string;
    initialData?: PaginatedResponse<T>;
    pageSize?: number;
}

export interface UseFetchContentReturn<T> {
    items: T[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    total: number;
    loadMore: () => void;
    reset: () => void;
}

const contentFetchers: Record<ContentType, (token?: string, params?: Record<string, string | number>) => Promise<PaginatedResponse<any>>> = {
    story: (token, params) => apiClient.stories.list(token, params),
    project: (_token, params) => apiClient.projects.list(params),
    page: () => Promise.resolve({ items: [], total: 0, limit: 0, offset: 0 }),
    photo_essay: (_token, params) => apiClient.photoEssays.list(params),
};

export function useFetchContent<T>(options: UseFetchContentOptions<T>): UseFetchContentReturn<T> {
    const { contentType, sectionId, initialData, pageSize = PAGE_SIZE } = options;
    const { data: session } = useSession();

    const initialItems = initialData?.items ?? [];
    const [items, setItems] = useState<T[]>(initialItems);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(
        initialData ? initialItems.length < initialData.total : true
    );
    const [total, setTotal] = useState(initialData?.total || 0);

    const offsetRef = useRef(initialItems.length);
    const tokenRef = useRef(session?.accessToken);
    const loadingRef = useRef(false);
    const hasMoreRef = useRef(hasMore);
    const prevSectionIdRef = useRef(sectionId);
    const prevTokenRef = useRef(session?.accessToken);
    const initialFetchDoneRef = useRef(false);

    useEffect(() => { loadingRef.current = loading; }, [loading]);
    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { tokenRef.current = session?.accessToken; }, [session?.accessToken]);

    const fetchInternal = useCallback(async (reset = false) => {
        if (loadingRef.current) return;

        if (reset) {
            offsetRef.current = 0;
            // Don't clear items here — keep showing current data until response arrives
            hasMoreRef.current = true;
        }

        if (!reset && !hasMoreRef.current) return;

        setLoading(true);
        loadingRef.current = true;
        setError(null);

        try {
            const params: Record<string, string | number> = {
                limit: pageSize,
                offset: offsetRef.current,
            };
            if (sectionId) {
                params.section_id = sectionId;
            }
            if (contentType === 'story' && session?.user?.role === 'admin') {
                params.include_drafts = 1;
            }

            const fetcher = contentFetchers[contentType];
            const response = await fetcher(tokenRef.current, params);
            const responseItems = response.items ?? [];

            setTotal(response.total);
            setItems(prev => reset ? responseItems : [...prev, ...responseItems]);

            offsetRef.current += responseItems.length;
            const newHasMore = offsetRef.current < response.total;
            setHasMore(newHasMore);
            hasMoreRef.current = newHasMore;
        } catch (err) {
            const message = err instanceof ApiRequestError ? err.message : `Failed to fetch ${contentType} content`;
            setError(message);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session?.user?.role is read inside but intentionally excluded to prevent re-fetch loops on role changes
    }, [contentType, sectionId, pageSize, session?.accessToken]);

    // Fetch on mount only if no SSR data was provided
    useEffect(() => {
        if (!initialData?.items?.length) {
            fetchInternal(true);
        }
        initialFetchDoneRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only fetch; fetchInternal is stable via refs
    }, []);

    // Re-fetch when sectionId changes (client-side navigation)
    useEffect(() => {
        if (prevSectionIdRef.current !== sectionId) {
            prevSectionIdRef.current = sectionId;
            // Immediately show SSR data for the new section
            const newInitialItems = initialData?.items ?? [];
            if (newInitialItems.length > 0) {
                setItems(newInitialItems);
                setTotal(initialData!.total);
                offsetRef.current = newInitialItems.length;
                const newHasMore = newInitialItems.length < initialData!.total;
                setHasMore(newHasMore);
                hasMoreRef.current = newHasMore;
            }
            // Then re-fetch to get authenticated data (e.g. drafts)
            fetchInternal(true);
        }
    }, [sectionId, initialData, fetchInternal]);

    // Re-fetch when auth token changes (login/logout)
    useEffect(() => {
        if (!initialFetchDoneRef.current) return;
        if (prevTokenRef.current !== session?.accessToken) {
            prevTokenRef.current = session?.accessToken;
            fetchInternal(true);
        }
    }, [session?.accessToken, fetchInternal]);

    const loadMore = useCallback(() => fetchInternal(false), [fetchInternal]);
    const resetContent = useCallback(() => fetchInternal(true), [fetchInternal]);

    return { items, loading, error, hasMore, total, loadMore, reset: resetContent };
}
