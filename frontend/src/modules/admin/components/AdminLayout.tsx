import { AdminDesktopGate } from "./AdminDesktopGate";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDetailPanel } from "./AdminDetailPanel";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { applyStoredTheme } from "@/lib/theme";
import { useSectionTree } from "../hooks/useSectionTree";
import { useSectionReorder } from "../hooks/useSectionReorder";

export function AdminLayout() {
  const router = useRouter();
  const selectedSectionId = (router.query.section as string) ?? null;
  const { treeData, loading, refetch } = useSectionTree();
  const { onDrop } = useSectionReorder(refetch);

  useEffect(() => {
    applyStoredTheme();
  }, []);

  const handleSelectSection = (id: string | null) => {
    const query = id ? { section: id } : {};
    router.replace({ pathname: "/admin", query }, undefined, { shallow: true });
  };

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
          onDrop={onDrop}
        />
        <AdminDetailPanel selectedSectionId={selectedSectionId} />
      </div>
    </AdminDesktopGate>
  );
}
