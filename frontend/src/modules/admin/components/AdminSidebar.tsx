import { ScrollArea } from "@/components/admin-ui/scroll-area";
import { Input } from "@/components/admin-ui/input";
import { Button } from "@/components/admin-ui/button";
import { Separator } from "@/components/admin-ui/separator";
import { Plus, Search, FileText } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { SectionTree } from "./SectionTree";
import { SectionTreeData } from "../hooks/useSectionTree";
import { useState } from "react";

interface AdminSidebarProps {
  selectedSectionId: string | null;
  activeView: string | null;
  onSelectSection: (id: string | null) => void;
  onSelectView: (view: string | null) => void;
  treeData: SectionTreeData;
  loading: boolean;
  onRefetch: () => void;
  onAddContent: (sectionId: string) => void;
  onAddChildSection: (parentId: string) => void;
  onEditSettings: (sectionId: string) => void;
  onDeleteSection: (sectionId: string, sectionTitle: string) => void;
  onAddRootSection: () => void;
}

export function AdminSidebar({
  selectedSectionId,
  activeView,
  onSelectSection,
  onSelectView,
  treeData,
  loading,
  onRefetch,
  onAddContent,
  onAddChildSection,
  onEditSettings,
  onDeleteSection,
  onAddRootSection,
}: AdminSidebarProps) {
  const [filter, setFilter] = useState("");

  return (
    <div className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar-background">
      <div className="flex items-center justify-between p-4">
        <button
          className="text-lg font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors cursor-pointer bg-transparent border-none p-0"
          onClick={() => onSelectView(null)}
          data-testid="admin-home-link"
        >
          Master Control
        </button>
        <ThemeToggle />
      </div>
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter sections..."
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            data-testid="admin-section-filter"
          />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              Loading sections...
            </p>
          </div>
        ) : (
          <SectionTree
            data={treeData}
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
            onRefetch={onRefetch}
            filter={filter}
            onAddContent={onAddContent}
            onAddChildSection={onAddChildSection}
            onEditSettings={onEditSettings}
            onDeleteSection={onDeleteSection}
          />
        )}
      </ScrollArea>
      <Separator />
      <div className="p-3">
        <Button
          variant={activeView === "resume" && !selectedSectionId ? "secondary" : "ghost"}
          size="sm"
          className="w-full justify-start"
          onClick={() => onSelectView("resume")}
          data-testid="admin-resume-nav"
        >
          <FileText className="mr-2 h-4 w-4" />
          Resume
        </Button>
      </div>
      <Separator />
      <div className="p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAddRootSection}
          data-testid="admin-add-root-section"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>
    </div>
  );
}
