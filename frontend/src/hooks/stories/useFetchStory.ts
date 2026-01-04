/**
 * Hook for fetching a single story by ID.
 */
import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/types/error';
import { Story } from '@/types/api';

export interface UseFetchStoryReturn {
  story: Story | null;
  loading: boolean;
  error: string | null;
  fetchStory: (storyId: string) => Promise<void>;
}

/**
 * Fetches a single story by ID.
 * Auto-fetches if an ID is provided to the hook.
 *
 * @param id - Optional story ID to auto-fetch on mount
 */
export function useFetchStory(id?: string): UseFetchStoryReturn {
  const { data: session } = useSession();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStory = useCallback(async (storyId: string) => {
    if (!storyId || !session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.stories.getById(storyId, session.accessToken);
      setStory(data);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.status === 404 ? 'Story not found' : err.message);
      } else {
        setError('Failed to fetch story');
      }
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  // Auto-fetch if ID is provided
  useEffect(() => {
    if (id) {
      fetchStory(id);
    }
  }, [id, fetchStory]);

  return { story, loading, error, fetchStory };
}

export default useFetchStory;
