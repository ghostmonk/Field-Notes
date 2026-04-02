import { useState, useCallback, useEffect, useRef } from "react";
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
}

export function useSectionAssetBrowser(
  sectionId: string | null
): UseSectionAssetBrowserReturn {
  const { data: session } = useSession();
  const [items, setItems] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const cursorRef = useRef<string | null>(null);
  const activeSectionRef = useRef<string | null>(null);

  const fetchPage = useCallback(
    async (nextCursor?: string) => {
      if (!sectionId || !session?.accessToken) return;

      const requestSection = sectionId;
      activeSectionRef.current = requestSection;
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

        // Discard stale response if section changed during fetch
        if (activeSectionRef.current !== requestSection) return;

        if (nextCursor) {
          setItems((prev) => [...prev, ...response.items]);
        } else {
          setItems(response.items);
        }
        cursorRef.current = response.next_cursor;
        setHasMore(response.next_cursor !== null);
        setTotalCount(response.total_count);
      } catch (err) {
        if (activeSectionRef.current !== requestSection) return;
        setError(err instanceof Error ? err.message : "Failed to load assets");
      } finally {
        if (activeSectionRef.current === requestSection) {
          setLoading(false);
        }
      }
    },
    [sectionId, session?.accessToken]
  );

  useEffect(() => {
    if (!sectionId || !session?.accessToken) {
      setItems([]);
      cursorRef.current = null;
      setHasMore(false);
      setTotalCount(0);
      return;
    }
    fetchPage();
  }, [sectionId, session?.accessToken, fetchPage]);

  const loadMore = useCallback(() => {
    if (cursorRef.current && !loading) {
      fetchPage(cursorRef.current);
    }
  }, [loading, fetchPage]);

  return { items, loading, error, hasMore, totalCount, loadMore };
}
