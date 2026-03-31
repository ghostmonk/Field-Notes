import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import {
  Section,
  CreateSectionRequest,
  SectionContentType,
} from "@/shared/types/api";
import { useSectionContent } from "../hooks/useSectionContent";
import { useContentMutations } from "../hooks/useContentMutations";
import { useSectionMutations } from "@/modules/sections/hooks/useSectionMutations";
import { ContentTable } from "./ContentTable";
import { DeleteContentDialog } from "./DeleteContentDialog";
import { AddSectionDialog } from "./AddSectionDialog";
import { ContentRow } from "../types";
import { SectionTreeData } from "../hooks/useSectionTree";

interface ContentTabProps {
  section: Section;
  treeData: SectionTreeData;
  onSelectSection: (id: string) => void;
  onRefetchTree: () => void;
}

export function ContentTab({
  section,
  treeData,
  onSelectSection,
  onRefetchTree,
}: ContentTabProps) {
  const router = useRouter();
  const { rows: contentRows, loading, refetch } = useSectionContent(
    section.id,
    section.content_type as SectionContentType | undefined
  );
  const { togglePublish, deleteContent } = useContentMutations();
  const { createSection } = useSectionMutations();

  const [deleteTarget, setDeleteTarget] = useState<ContentRow | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);

  const allRows = useMemo(() => {
    const treeItem = treeData[section.id];
    if (!treeItem) return contentRows;

    const childSectionRows: ContentRow[] = treeItem.childrenIds
      .map((childId) => treeData[childId])
      .filter(Boolean)
      .map((child) => ({
        id: child.id,
        title: child.title,
        kind: "section" as const,
        contentType: (child.content_type as SectionContentType) ?? null,
        isPublished: child.is_published,
        updatedDate: child.updatedDate,
        slug: child.slug,
      }));

    return [...childSectionRows, ...contentRows];
  }, [contentRows, treeData, section.id]);

  const handleEdit = (row: ContentRow) => {
    if (row.kind === "section") {
      onSelectSection(row.id);
      return;
    }
    const params = new URLSearchParams({
      id: row.id,
      type: row.contentType ?? "story",
      origin: "admin",
    });
    router.push(`/editor?${params.toString()}`);
  };

  const handleTogglePublish = async (row: ContentRow) => {
    if (row.kind === "section" || !row.contentType) return;
    const success = await togglePublish(
      row.id,
      row.contentType,
      row.isPublished
    );
    if (success) refetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteTarget.contentType) return;
    const success = await deleteContent(
      deleteTarget.id,
      deleteTarget.contentType
    );
    if (success) {
      setDeleteTarget(null);
      refetch();
    }
  };

  const handleAddContent = () => {
    const params = new URLSearchParams({
      section: section.id,
      type: section.content_type ?? "story",
      origin: "admin",
    });
    router.push(`/editor?${params.toString()}`);
  };

  const handleCreateSection = async (data: CreateSectionRequest) => {
    const result = await createSection(data);
    if (result) {
      onRefetchTree();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleAddContent}
          data-testid="add-content-btn"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Content
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddSection(true)}
          data-testid="add-section-btn"
        >
          <FolderPlus className="mr-1 h-4 w-4" />
          Add Section
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <ContentTable
          rows={allRows}
          onEdit={handleEdit}
          onTogglePublish={handleTogglePublish}
          onDelete={setDeleteTarget}
          onSelectSection={onSelectSection}
        />
      )}

      <DeleteContentDialog
        row={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <AddSectionDialog
        open={showAddSection}
        parentId={section.id}
        onSubmit={handleCreateSection}
        onClose={() => setShowAddSection(false)}
      />
    </div>
  );
}
