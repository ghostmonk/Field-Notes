import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { Section, CreateSectionRequest, UpdateSectionRequest } from '@/shared/types/api';
import { ErrorService } from '@/services/errorService';

export interface UseSectionMutationsReturn {
  loading: boolean;
  error: string | null;
  createSection: (data: CreateSectionRequest) => Promise<Section | null>;
  updateSection: (id: string, data: UpdateSectionRequest) => Promise<Section | null>;
  deleteSection: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useSectionMutations(): UseSectionMutationsReturn {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const handleApiError = useCallback((err: unknown, fallbackMessage: string) => {
    if (err instanceof ApiRequestError) {
      setError(err.status === 401 ? ErrorService.handleAuthError(err) : err.getUserMessage());
    } else {
      setError(fallbackMessage);
    }
  }, []);

  const createSection = useCallback(async (data: CreateSectionRequest): Promise<Section | null> => {
    if (!session?.accessToken) {
      setError('You must be logged in to create a section');
      return null;
    }

    setLoading(true);
    clearError();

    try {
      const result = await apiClient.sections.create(data, session.accessToken);
      return result;
    } catch (err) {
      handleApiError(err, 'Failed to create section');
      return null;
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, clearError, handleApiError]);

  const updateSection = useCallback(async (id: string, data: UpdateSectionRequest): Promise<Section | null> => {
    if (!session?.accessToken) {
      setError('You must be logged in to update a section');
      return null;
    }

    setLoading(true);
    clearError();

    try {
      const result = await apiClient.sections.update(id, data, session.accessToken);
      return result;
    } catch (err) {
      handleApiError(err, 'Failed to update section');
      return null;
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, clearError, handleApiError]);

  const deleteSection = useCallback(async (id: string): Promise<boolean> => {
    if (!session?.accessToken) {
      setError('You must be logged in to delete a section');
      return false;
    }

    setLoading(true);
    clearError();

    try {
      await apiClient.sections.delete(id, session.accessToken);
      return true;
    } catch (err) {
      handleApiError(err, 'Failed to delete section');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, clearError, handleApiError]);

  return { loading, error, createSection, updateSection, deleteSection, clearError };
}
