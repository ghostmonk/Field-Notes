import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { AssetGroup } from "@/shared/types/api";

interface UseSectionAssetBrowserReturn {
  items: AssetGroup[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
  refresh: () => void;
}

export function useSectionAssetBrowser(
  sectionId: string | null
): UseSectionAssetBrowserReturn {
  const { data: session } = useSession();
  const [items, setItems] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const fetchPage = useCallback(
    async (nextCursor?: string) => {
      if (!sectionId || !session?.accessToken) {
        setItems([]);
        setHasMore(false);
        setTotalCount(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params: { limit: number; cursor?: string } = { limit: 30 };
        if (nextCursor) params.cursor = nextCursor;

        const response = await apiClient.assets.bySection(
          sectionId,
          session.accessToken,
          params
        );

        if (nextCursor) {
          setItems((prev) => [...prev, ...response.items]);
        } else {
          setItems(response.items);
        }
        setCursor(response.next_cursor);
        setHasMore(response.next_cursor !== null);
        setTotalCount(response.total_count);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assets");
      } finally {
        setLoading(false);
      }
    },
    [sectionId, session?.accessToken]
  );

  // Auto-fetch on first render when sectionId is available
  if (sectionId && session?.accessToken && !initialized && !loading) {
    setInitialized(true);
    fetchPage();
  }

  // Reset when section changes
  if (!sectionId && initialized) {
    setInitialized(false);
    setItems([]);
    setCursor(null);
    setHasMore(false);
    setTotalCount(0);
  }

  const loadMore = useCallback(() => {
    if (cursor && !loading) {
      fetchPage(cursor);
    }
  }, [cursor, loading, fetchPage]);

  const refresh = useCallback(() => {
    setCursor(null);
    fetchPage();
  }, [fetchPage]);

  return { items, loading, error, hasMore, totalCount, loadMore, refresh };
}
