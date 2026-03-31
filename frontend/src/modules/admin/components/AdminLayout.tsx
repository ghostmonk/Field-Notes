import { AdminDesktopGate } from "./AdminDesktopGate";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDetailPanel } from "./AdminDetailPanel";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { applyStoredTheme } from "@/lib/theme";
import { useSectionTree } from "../hooks/useSectionTree";

export function AdminLayout() {
  const router = useRouter();
  const selectedSectionId = (router.query.section as string) ?? null;
  const { treeData, loading, refetch } = useSectionTree();

  useEffect(() => {
    applyStoredTheme();
  }, []);

  const selectedSection = useMemo(
    () => (selectedSectionId ? treeData[selectedSectionId] ?? null : null),
    [selectedSectionId, treeData]
  );

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
          onRefetch={refetch}
        />
        <AdminDetailPanel
          section={selectedSection}
          treeData={treeData}
          onSelectSection={handleSelectSection}
          onRefetchTree={refetch}
        />
      </div>
    </AdminDesktopGate>
  );
}
