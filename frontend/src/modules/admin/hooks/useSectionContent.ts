import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { SectionContentType } from "@/shared/types/api";
import { ContentRow } from "../types";

interface UseSectionContentReturn {
  rows: ContentRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

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

    if (contentType === "page") {
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        section_id: sectionId,
        limit: 100,
        offset: 0,
      };

      let items: ContentRow[] = [];

      if (contentType === "story") {
        params.include_drafts = 1;
        const response = await apiClient.stories.list(
          session.accessToken,
          params
        );
        items = response.items.map((s) => ({
          id: s.id,
          title: s.title,
          kind: "content" as const,
          contentType: "story" as const,
          isPublished: s.is_published,
          updatedDate: s.updatedDate,
          slug: s.slug,
        }));
      } else if (contentType === "project") {
        params.include_unpublished = 1;
        const response = await apiClient.projects.list(params);
        items = response.items.map((p) => ({
          id: p.id,
          title: p.title,
          kind: "content" as const,
          contentType: "project" as const,
          isPublished: p.is_published,
          updatedDate: p.updatedDate,
          slug: p.slug,
        }));
      } else if (contentType === "photo_essay") {
        params.include_unpublished = 1;
        const response = await apiClient.photoEssays.list(params);
        items = response.items.map((pe) => ({
          id: pe.id,
          title: pe.title,
          kind: "content" as const,
          contentType: "photo_essay" as const,
          isPublished: pe.is_published,
          updatedDate: pe.updatedDate,
          slug: pe.slug ?? "",
        }));
      }

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
