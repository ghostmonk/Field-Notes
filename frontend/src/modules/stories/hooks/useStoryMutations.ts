/**
 * Hook for story mutation operations (create, update, delete).
 */
import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { Story, CreateStoryRequest } from '@/shared/types/api';
import { ErrorService } from '@/services/errorService';

export interface MutationErrorDetails {
  status?: number;
  data?: unknown;
  requestDetails?: unknown;
  message?: string;
  stack?: string;
}

export interface UseStoryMutationsReturn {
  loading: boolean;
  error: string | null;
  errorDetails: MutationErrorDetails | null;
  success: boolean;
  createStory: (storyData: CreateStoryRequest) => Promise<Story | null>;
  updateStory: (id: string, storyData: Partial<Story>) => Promise<Story | null>;
  deleteStory: (id: string) => Promise<boolean>;
  saveStory: (storyData: Partial<Story>, shouldRedirect?: boolean) => Promise<Story | null>;
  clearError: () => void;
}

/**
 * Provides story CRUD operations with error handling.
 */
export function useStoryMutations(): UseStoryMutationsReturn {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorDetails, setErrorDetails] = useState<MutationErrorDetails | null>(null);

  const clearError = useCallback(() => {
    setError(null);
    setErrorDetails(null);
  }, []);

  const handleApiError = useCallback((err: unknown, fallbackMessage: string) => {
    if (err instanceof ApiRequestError) {
      const errMsg = err.status === 401
        ? ErrorService.handleAuthError(err)
        : err.getUserMessage();

      setError(errMsg);
      setErrorDetails({
        status: err.status,
        data: err.data,
        requestDetails: err.requestDetails
      });
    } else {
      setError(fallbackMessage);
      setErrorDetails(err instanceof Error
        ? { message: err.message, stack: err.stack }
        : null
      );
    }
  }, []);

  const createStory = useCallback(async (storyData: CreateStoryRequest): Promise<Story | null> => {
    if (!session?.accessToken) {
      setError('You must be logged in to create a story');
      return null;
    }

    setLoading(true);
    clearError();
    setSuccess(false);

    try {
      const newStory = await apiClient.stories.create(storyData, session.accessToken);
      setSuccess(true);
      return newStory;
    } catch (err) {
      handleApiError(err, 'Failed to create story');
      return null;
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, clearError, handleApiError]);

  const updateStory = useCallback(async (id: string, storyData: Partial<Story>): Promise<Story | null> => {
    if (!session?.accessToken) {
      setError('You must be logged in to update a story');
      return null;
    }

    setLoading(true);
    clearError();
    setSuccess(false);

    try {
      const updatedStory = await apiClient.stories.update(id, storyData, session.accessToken);
      setSuccess(true);
      return updatedStory;
    } catch (err) {
      handleApiError(err, 'Failed to update story');
      return null;
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, clearError, handleApiError]);

  const deleteStory = useCallback(async (id: string): Promise<boolean> => {
    if (!session?.accessToken) {
      setError('You must be logged in to delete a story');
      return false;
    }

    setLoading(true);
    clearError();
    setSuccess(false);

    try {
      await apiClient.stories.delete(id, session.accessToken);
      setSuccess(true);
      return true;
    } catch (err) {
      handleApiError(err, 'Failed to delete story');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, clearError, handleApiError]);

  const saveStory = useCallback(async (
    storyData: Partial<Story>,
    shouldRedirect = true
  ): Promise<Story | null> => {
    const result = storyData.id
      ? await updateStory(storyData.id, storyData)
      : await createStory(storyData as CreateStoryRequest);

    if (result && shouldRedirect) {
      router.push('/');
    }

    return result;
  }, [createStory, updateStory, router]);

  return {
    loading,
    error,
    errorDetails,
    success,
    createStory,
    updateStory,
    deleteStory,
    saveStory,
    clearError,
  };
}

export default useStoryMutations;
