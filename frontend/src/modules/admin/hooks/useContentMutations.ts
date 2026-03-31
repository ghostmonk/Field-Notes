import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { SectionContentType } from "@/shared/types/api";

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
      if (!session?.accessToken) return false;
      setLoading(true);
      setError(null);

      try {
        const body = { is_published: !currentlyPublished };
        if (contentType === "story") {
          await apiClient.stories.update(id, body, session.accessToken);
        } else if (contentType === "project") {
          await apiClient.projects.update(id, body, session.accessToken);
        } else if (contentType === "photo_essay") {
          await apiClient.photoEssays.update(id, body, session.accessToken);
        }
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
      if (!session?.accessToken) return false;
      setLoading(true);
      setError(null);

      try {
        if (contentType === "story") {
          await apiClient.stories.delete(id, session.accessToken);
        } else if (contentType === "project") {
          await apiClient.projects.delete(id, session.accessToken);
        } else if (contentType === "photo_essay") {
          await apiClient.photoEssays.delete(id, session.accessToken);
        }
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
