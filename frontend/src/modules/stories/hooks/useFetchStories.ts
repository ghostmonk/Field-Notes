/**
 * Hook for fetching stories with infinite scrolling support.
 * Handles pagination, caching via refs, and token-based refetching.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { Story, PaginatedResponse } from '@/shared/types/api';

const STORIES_PAGE_SIZE = 5;

export interface UseFetchStoriesOptions {
  initialData?: PaginatedResponse<Story>;
  initialError?: string;
}

export interface UseFetchStoriesReturn {
  stories: Story[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalStories: number;
  fetchStories: () => void;
  resetStories: () => void;
}

/**
 * Fetches stories with infinite scroll pagination.
 * Automatically refetches when authentication token changes.
 */
export function useFetchStories(options: UseFetchStoriesOptions = {}): UseFetchStoriesReturn {
  const { initialData, initialError } = options;
  const { data: session } = useSession();

  const [stories, setStories] = useState<Story[]>(initialData?.items || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [hasMore, setHasMore] = useState(
    initialData ? initialData.items.length < initialData.total : true
  );
  const [totalStories, setTotalStories] = useState(initialData?.total || 0);

  // Refs to track state without triggering re-renders
  const offsetRef = useRef(initialData?.items.length || 0);
  const tokenRef = useRef(session?.accessToken);
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const prevTokenRef = useRef(session?.accessToken);
  const initialFetchDoneRef = useRef(false);

  // Sync refs with state
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { tokenRef.current = session?.accessToken; }, [session?.accessToken]);

  const fetchStoriesInternal = useCallback(async (reset = false) => {
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
      const response = await apiClient.stories.list(tokenRef.current, {
        limit: STORIES_PAGE_SIZE,
        offset: offsetRef.current,
        include_drafts: session?.user?.role === 'admin'
      });

      setTotalStories(response.total);
      setStories(prev => reset ? response.items : [...prev, ...response.items]);

      offsetRef.current += response.items.length;
      const newHasMore = offsetRef.current < response.total;
      setHasMore(newHasMore);
      hasMoreRef.current = newHasMore;
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to fetch stories';
      setError(message);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [session?.accessToken]);

  // Always fetch fresh data on mount
  useEffect(() => {
    fetchStoriesInternal(true);
    initialFetchDoneRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only fetch; fetchStoriesInternal is stable via refs
  }, []);

  // Refetch when token changes (login/logout)
  useEffect(() => {
    if (!initialFetchDoneRef.current) return;
    if (prevTokenRef.current !== session?.accessToken) {
      prevTokenRef.current = session?.accessToken;
      fetchStoriesInternal(true);
    }
  }, [session?.accessToken, fetchStoriesInternal]);

  const loadMore = useCallback(() => fetchStoriesInternal(false), [fetchStoriesInternal]);
  const resetStories = useCallback(() => fetchStoriesInternal(true), [fetchStoriesInternal]);

  return {
    stories,
    loading,
    error,
    fetchStories: loadMore,
    hasMore,
    totalStories,
    resetStories,
  };
}

export default useFetchStories;
