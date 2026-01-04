/**
 * Hook for managing story editor form state and actions.
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { Story } from '@/types/api';
import { isTokenExpired } from '@/lib/auth';
import { useFetchStory, useStoryMutations } from '@/hooks/stories';
import { logger } from '@/shared/utils/logger';

const EMPTY_STORY: Partial<Story> = {
  title: '',
  content: '',
  is_published: true,
};

const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface UseStoryEditorReturn {
  story: Partial<Story>;
  error: string | null;
  isSaving: boolean;
  isLoading: boolean;
  isEditing: boolean;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  setPublished: (published: boolean) => void;
  handleSubmit: (e: React.FormEvent, shouldPublish?: boolean) => Promise<void>;
  handleDelete: () => Promise<void>;
  resetForm: () => void;
  clearError: () => void;
}

/**
 * Manages story editor state including:
 * - Form state (title, content, is_published)
 * - Loading and saving states
 * - Auto-save on session expiry
 * - Fetching existing stories for editing
 */
export function useStoryEditor(): UseStoryEditorReturn {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { id } = router.query;
  const storyId = typeof id === 'string' ? id : undefined;

  const { story: fetchedStory, loading: fetchLoading, error: fetchError } = useFetchStory(storyId);
  const { saveStory, deleteStory, loading: saveLoading, error: saveError } = useStoryMutations();

  const [story, setStory] = useState<Partial<Story>>(EMPTY_STORY);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Clear local error when mutation succeeds
  const clearError = useCallback(() => setError(null), []);

  // Reset form to empty state
  const resetForm = useCallback(() => {
    setStory(EMPTY_STORY);
    setError(null);
    router.push('/editor', undefined, { shallow: true });
  }, [router]);

  // Field updaters
  const setTitle = useCallback((title: string) => {
    setStory(prev => ({ ...prev, title }));
  }, []);

  const setContent = useCallback((content: string) => {
    setStory(prev => ({ ...prev, content }));
  }, []);

  const setPublished = useCallback((is_published: boolean) => {
    setStory(prev => ({ ...prev, is_published }));
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent, shouldPublish = true) => {
    e.preventDefault();

    if (!session?.accessToken) {
      setError(session ? 'No access token found. Please log in again.' : 'You must be logged in to save a story');
      return;
    }

    if (!story.title?.trim()) {
      setError('Story title is required');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const storyToSave = {
        ...story,
        is_published: shouldPublish ? story.is_published : false,
      };

      logger.info('Saving story', { id: story.id, title: story.title });
      const result = await saveStory(storyToSave, false);

      if (!result) {
        throw new Error('Failed to save story');
      }

      logger.info('Story saved', { id: result.id, title: result.title });
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error: ${message}`);
      setIsSaving(false);
    }
  }, [session, story, saveStory, router]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!story.id || !session) {
      setError('Cannot delete story: missing ID or not logged in');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${story.title}"? This action cannot be undone.`)) {
      return;
    }

    const success = await deleteStory(story.id);
    if (success) {
      router.push('/');
    }
  }, [story.id, story.title, session, deleteStory, router]);

  // Sync fetched story to form state
  useEffect(() => {
    if (fetchedStory) {
      setStory(fetchedStory);
      setError(null);
    }
  }, [fetchedStory]);

  // Sync fetch error to local error state
  useEffect(() => {
    if (fetchError && storyId) {
      setError(fetchError);
    }
  }, [fetchError, storyId]);

  // Reset form when navigating to /editor without ID
  useEffect(() => {
    if (!storyId && (Object.keys(router.query).length > 0 || story.id)) {
      resetForm();
    }
  }, [storyId, router.query, story.id, resetForm]);

  // Populate form from query params (for new stories with prefilled data)
  useEffect(() => {
    if (!storyId) {
      const { title, content, is_published } = router.query;
      if (title || content) {
        setStory({
          title: (title as string) || '',
          content: (content as string) || '',
          is_published: is_published === 'true',
        });
      }
    }
  }, [router.query, storyId]);

  // Auto-save on token expiry
  useEffect(() => {
    const interval = setInterval(() => {
      if (session?.accessToken && isTokenExpired(session.accessToken) && (story.title || story.content)) {
        handleSubmit(new Event('submit') as unknown as React.FormEvent, false).then(() => {
          alert('Session expired. Your story has been saved as a draft. Logging out.');
          signOut();
        });
      }
    }, TOKEN_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [session?.accessToken, story.title, story.content, handleSubmit]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const isLoading = fetchLoading || saveLoading || status === 'loading';
  const combinedError = error || saveError;

  return {
    story,
    error: combinedError,
    isSaving,
    isLoading,
    isEditing: !!story.id,
    setTitle,
    setContent,
    setPublished,
    handleSubmit,
    handleDelete,
    resetForm,
    clearError,
  };
}
