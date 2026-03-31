import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { SectionContentType } from "@/shared/types/api";

export interface AssetInfo {
  url: string;
  type: "image" | "video";
  fromContentTitle: string;
}

function extractAssetsFromHtml(html: string, contentTitle: string): AssetInfo[] {
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

function dedupe(assets: AssetInfo[]): AssetInfo[] {
  const seen = new Set<string>();
  return assets.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

async function fetchStoryAssets(
  sectionId: string,
  token: string
): Promise<AssetInfo[]> {
  const response = await apiClient.stories.list(token, {
    section_id: sectionId,
    limit: 50,
    offset: 0,
    include_drafts: true,
  });

  const assets: AssetInfo[] = [];
  for (const story of response.items) {
    if (story.content) {
      assets.push(...extractAssetsFromHtml(story.content, story.title));
    }
  }
  return assets;
}

async function fetchPhotoEssayAssets(
  sectionId: string
): Promise<AssetInfo[]> {
  const listResponse = await apiClient.photoEssays.list({
    section_id: sectionId,
    limit: 50,
    offset: 0,
  });

  const assets: AssetInfo[] = [];

  // Cover images from list response
  for (const card of listResponse.items) {
    if (card.cover_image_url) {
      assets.push({
        url: card.cover_image_url,
        type: "image",
        fromContentTitle: card.title,
      });
    }
  }

  // Fetch each essay's full photos in parallel
  const details = await Promise.all(
    listResponse.items.map((card) => apiClient.photoEssays.getById(card.id))
  );
  for (const essay of details) {
    for (const photo of essay.photos) {
      assets.push({
        url: photo.url,
        type: "image",
        fromContentTitle: essay.title,
      });
    }
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
    const supported = contentType === "story" || contentType === "photo_essay";
    if (!sectionId || !supported || !session?.accessToken) {
      setAssets([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let allAssets: AssetInfo[];
      if (contentType === "story") {
        allAssets = await fetchStoryAssets(sectionId, session.accessToken);
      } else {
        allAssets = await fetchPhotoEssayAssets(sectionId);
      }
      setAssets(dedupe(allAssets));
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
