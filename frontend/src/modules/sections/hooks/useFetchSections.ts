import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';
import { Section } from '@/shared/types/api';

export interface UseFetchSectionsReturn {
  sections: Section[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  clearError: () => void;
}

export function useFetchSections(): UseFetchSectionsReturn {
  const { data: session } = useSession();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => setFetchCount((c: number) => c + 1), []);
  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchSections() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.sections.list(session?.accessToken);
        if (!cancelled) {
          setSections(response.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch sections');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSections();
    return () => { cancelled = true; };
  }, [session?.accessToken, fetchCount]);

  return { sections, loading, error, refetch, clearError };
}
