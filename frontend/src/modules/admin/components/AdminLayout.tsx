import { AdminDesktopGate } from "./AdminDesktopGate";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDetailPanel } from "./AdminDetailPanel";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export function AdminLayout() {
  const router = useRouter();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const sectionId = router.query.section as string | undefined;
    setSelectedSectionId(sectionId ?? null);
  }, [router.query.section]);

  const handleSelectSection = (id: string | null) => {
    setSelectedSectionId(id);
    const query = id ? { section: id } : {};
    router.replace({ pathname: "/admin", query }, undefined, { shallow: true });
  };

  return (
    <AdminDesktopGate>
      <div
        className="admin-theme flex h-dvh"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
        data-testid="admin-command-center"
      >
        <AdminSidebar
          selectedSectionId={selectedSectionId}
          onSelectSection={handleSelectSection}
        />
        <AdminDetailPanel selectedSectionId={selectedSectionId} />
      </div>
    </AdminDesktopGate>
  );
}
