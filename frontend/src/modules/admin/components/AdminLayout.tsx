import { AdminDesktopGate } from "./AdminDesktopGate";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDetailPanel } from "./AdminDetailPanel";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

function applyStoredTheme() {
  const stored = localStorage.getItem("theme");
  const theme = stored && ["light", "dark", "system"].includes(stored) ? stored : "system";
  const effective = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.setAttribute("data-theme", effective);
  if (effective === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function AdminLayout() {
  const router = useRouter();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    applyStoredTheme();
  }, []);

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
        className="admin-theme flex h-dvh bg-background text-foreground"
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
