import { AdminDesktopGate } from "./AdminDesktopGate";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDetailPanel } from "./AdminDetailPanel";
import { AddSectionDialog } from "./AddSectionDialog";
import { DeleteSectionDialog } from "./DeleteSectionDialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { applyStoredTheme } from "@/lib/theme";
import { useSectionTree } from "../hooks/useSectionTree";
import { useSectionMutations } from "@/modules/sections/hooks/useSectionMutations";
import { CreateSectionRequest } from "@/shared/types/api";

export function AdminLayout() {
  const router = useRouter();
  const selectedSectionId = (router.query.section as string) ?? null;
  const { treeData, loading, refetch } = useSectionTree();
  const { createSection, deleteSection } = useSectionMutations();

  const [activeTab, setActiveTab] = useState<string | undefined>();
  const [addSectionParentId, setAddSectionParentId] = useState<
    string | null | undefined
  >(undefined);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    applyStoredTheme();
  }, []);

  const selectedSection = useMemo(
    () => (selectedSectionId ? treeData[selectedSectionId] ?? null : null),
    [selectedSectionId, treeData]
  );

  const handleSelectSection = useCallback(
    (id: string | null) => {
      const query = id ? { section: id } : {};
      router.replace({ pathname: "/admin", query }, undefined, {
        shallow: true,
      });
    },
    [router]
  );

  const handleAddContent = useCallback(
    (sectionId: string) => {
      router.push(`/editor?section_id=${sectionId}`);
    },
    [router]
  );

  const handleAddChildSection = useCallback((parentId: string) => {
    setAddSectionParentId(parentId);
  }, []);

  const handleAddRootSection = useCallback(() => {
    setAddSectionParentId(null);
  }, []);

  const handleEditSettings = useCallback(
    (sectionId: string) => {
      handleSelectSection(sectionId);
      setActiveTab("settings");
    },
    [handleSelectSection]
  );

  const handleDeleteSection = useCallback(
    (sectionId: string, sectionTitle: string) => {
      setDeleteSectionTarget({ id: sectionId, title: sectionTitle });
    },
    []
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteSectionTarget) return;
    const success = await deleteSection(deleteSectionTarget.id);
    if (success) {
      if (selectedSectionId === deleteSectionTarget.id) {
        handleSelectSection(null);
      }
      refetch();
    }
    setDeleteSectionTarget(null);
  }, [
    deleteSectionTarget,
    deleteSection,
    selectedSectionId,
    handleSelectSection,
    refetch,
  ]);

  const handleCreateSection = useCallback(
    async (data: CreateSectionRequest) => {
      await createSection(data);
      refetch();
      setAddSectionParentId(undefined);
    },
    [createSection, refetch]
  );

  const deleteTargetHasChildren = deleteSectionTarget
    ? (treeData[deleteSectionTarget.id]?.childrenIds.length ?? 0) > 0
    : false;

  return (
    <AdminDesktopGate>
      <div
        className="admin-theme flex h-dvh bg-background text-foreground"
        data-testid="admin-command-center"
      >
        <AdminSidebar
          selectedSectionId={selectedSectionId}
          onSelectSection={handleSelectSection}
          treeData={treeData}
          loading={loading}
          onRefetch={refetch}
          onAddContent={handleAddContent}
          onAddChildSection={handleAddChildSection}
          onEditSettings={handleEditSettings}
          onDeleteSection={handleDeleteSection}
          onAddRootSection={handleAddRootSection}
        />
        <AdminDetailPanel
          section={selectedSection}
          treeData={treeData}
          onSelectSection={handleSelectSection}
          onRefetchTree={refetch}
          activeTab={activeTab}
          onActiveTabConsumed={() => setActiveTab(undefined)}
        />
      </div>
      <AddSectionDialog
        open={addSectionParentId !== undefined}
        parentId={addSectionParentId ?? null}
        onSubmit={handleCreateSection}
        onClose={() => setAddSectionParentId(undefined)}
      />
      {deleteSectionTarget && (
        <DeleteSectionDialog
          open
          sectionTitle={deleteSectionTarget.title}
          hasChildren={deleteTargetHasChildren}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteSectionTarget(null)}
        />
      )}
    </AdminDesktopGate>
  );
}
