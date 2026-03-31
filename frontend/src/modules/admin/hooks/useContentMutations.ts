import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { SectionContentType } from "@/shared/types/api";

interface ContentApi {
  update: (id: string, body: Record<string, unknown>, token: string) => Promise<unknown>;
  delete: (id: string, token: string) => Promise<unknown>;
}

const CONTENT_APIS: Partial<Record<SectionContentType, ContentApi>> = {
  story: apiClient.stories,
  project: apiClient.projects,
  photo_essay: apiClient.photoEssays,
};

interface UseContentMutationsReturn {
  loading: boolean;
  error: string | null;
  togglePublish: (
    id: string,
    contentType: SectionContentType,
    currentlyPublished: boolean
  ) => Promise<boolean>;
  deleteContent: (
    id: string,
    contentType: SectionContentType
  ) => Promise<boolean>;
}

export function useContentMutations(): UseContentMutationsReturn {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePublish = useCallback(
    async (
      id: string,
      contentType: SectionContentType,
      currentlyPublished: boolean
    ): Promise<boolean> => {
      const api = CONTENT_APIS[contentType];
      if (!session?.accessToken || !api) return false;
      setLoading(true);
      setError(null);

      try {
        await api.update(id, { is_published: !currentlyPublished }, session.accessToken);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [session?.accessToken]
  );

  const deleteContent = useCallback(
    async (
      id: string,
      contentType: SectionContentType
    ): Promise<boolean> => {
      const api = CONTENT_APIS[contentType];
      if (!session?.accessToken || !api) return false;
      setLoading(true);
      setError(null);

      try {
        await api.delete(id, session.accessToken);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [session?.accessToken]
  );

  return { loading, error, togglePublish, deleteContent };
}
