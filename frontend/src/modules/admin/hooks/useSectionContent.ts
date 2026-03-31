import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { PaginatedResponse, SectionContentType } from "@/shared/types/api";
import { ContentRow } from "../types";

interface UseSectionContentReturn {
  rows: ContentRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface ContentFetchConfig {
  draftParam: string;
  fetch: (
    token: string,
    params: Record<string, string | number>
  ) => Promise<PaginatedResponse<{ id: string; title: string; is_published: boolean; updatedDate: string; slug?: string }>>;
}

const FETCH_CONFIG: Partial<Record<SectionContentType, ContentFetchConfig>> = {
  story: {
    draftParam: "include_drafts",
    fetch: (token, params) => apiClient.stories.list(token, params),
  },
  project: {
    draftParam: "include_unpublished",
    fetch: (_token, params) => apiClient.projects.list(params),
  },
  photo_essay: {
    draftParam: "include_unpublished",
    fetch: (_token, params) => apiClient.photoEssays.list(params),
  },
};

export function useSectionContent(
  sectionId: string | null,
  contentType: SectionContentType | undefined
): UseSectionContentReturn {
  const { data: session } = useSession();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    if (!sectionId || !contentType || !session?.accessToken) {
      setRows([]);
      return;
    }

    const config = FETCH_CONFIG[contentType];
    if (!config) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        section_id: sectionId,
        limit: 50,
        offset: 0,
        [config.draftParam]: 1,
      };

      const response = await config.fetch(session.accessToken, params);
      const items: ContentRow[] = response.items.map((item) => ({
        id: item.id,
        title: item.title,
        kind: "content" as const,
        contentType,
        isPublished: item.is_published,
        updatedDate: item.updatedDate,
        slug: item.slug ?? "",
      }));

      setRows(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch content");
    } finally {
      setLoading(false);
    }
  }, [sectionId, contentType, session?.accessToken]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { rows, loading, error, refetch: fetchContent };
}
