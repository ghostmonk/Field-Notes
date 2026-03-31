import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { SectionContentType } from "@/shared/types/api";

export interface AssetInfo {
  url: string;
  type: "image" | "video";
  fromContentTitle: string;
}

function extractAssets(html: string, contentTitle: string): AssetInfo[] {
  const assets: AssetInfo[] = [];
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  const videoRegex = /<(?:source|video)[^>]+src="([^"]+)"/g;

  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    assets.push({ url: match[1], type: "image", fromContentTitle: contentTitle });
  }
  while ((match = videoRegex.exec(html)) !== null) {
    assets.push({ url: match[1], type: "video", fromContentTitle: contentTitle });
  }
  return assets;
}

interface UseSectionAssetsReturn {
  assets: AssetInfo[];
  loading: boolean;
  error: string | null;
}

export function useSectionAssets(
  sectionId: string | null,
  contentType: SectionContentType | undefined
): UseSectionAssetsReturn {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!sectionId || contentType !== "story" || !session?.accessToken) {
      setAssets([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.stories.list(session.accessToken, {
        section_id: sectionId,
        limit: 50,
        offset: 0,
        include_drafts: true,
      });

      const allAssets: AssetInfo[] = [];
      for (const story of response.items) {
        if (story.content) {
          allAssets.push(...extractAssets(story.content, story.title));
        }
      }

      const seen = new Set<string>();
      const deduped = allAssets.filter((a) => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
      });

      setAssets(deduped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  }, [sectionId, contentType, session?.accessToken]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return { assets, loading, error };
}
