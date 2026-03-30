import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/shared/lib/api-client";
import { Section } from "@/shared/types/api";

export interface SectionTreeItem {
  id: string;
  title: string;
  icon: string;
  slug: string;
  path: string;
  content_type?: string;
  display_type: string;
  nav_visibility: string;
  is_published: boolean;
  sort_order: number;
  parent_id: string | null;
  childrenIds: string[];
}

export interface SectionTreeData {
  [id: string]: SectionTreeItem;
}

function buildTreeData(sections: Section[]): SectionTreeData {
  const data: SectionTreeData = {};

  for (const section of sections) {
    data[section.id] = {
      id: section.id,
      title: section.title,
      icon: section.icon,
      slug: section.slug,
      path: section.path,
      content_type: section.content_type,
      display_type: section.display_type,
      nav_visibility: section.nav_visibility,
      is_published: section.is_published,
      sort_order: section.sort_order,
      parent_id: section.parent_id,
      childrenIds: [],
    };
  }

  for (const section of sections) {
    const parentId = section.parent_id;
    if (parentId && data[parentId]) {
      data[parentId].childrenIds.push(section.id);
    }
  }

  for (const item of Object.values(data)) {
    item.childrenIds.sort(
      (a, b) => (data[a]?.sort_order ?? 0) - (data[b]?.sort_order ?? 0)
    );
  }

  const rootChildren = sections
    .filter((s) => !s.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.id);

  data["root"] = {
    id: "root",
    title: "Root",
    icon: "default",
    slug: "",
    path: "",
    content_type: undefined,
    display_type: "",
    nav_visibility: "hidden",
    is_published: true,
    sort_order: 0,
    parent_id: null,
    childrenIds: rootChildren,
  };

  return data;
}

export function useSectionTree() {
  const { data: session } = useSession();
  const [treeData, setTreeData] = useState<SectionTreeData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.sections.list(session.accessToken, {
        limit: 100,
        include_unpublished: "true",
      });
      setTreeData(buildTreeData(response.items));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch sections"
      );
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  return { treeData, loading, error, refetch: fetchSections };
}
