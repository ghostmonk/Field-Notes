import { ScrollArea } from "@/components/admin-ui/scroll-area";
import { Input } from "@/components/admin-ui/input";
import { Button } from "@/components/admin-ui/button";
import { Separator } from "@/components/admin-ui/separator";
import { Plus, Search } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface AdminSidebarProps {
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
}

export function AdminSidebar({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  selectedSectionId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSelectSection,
}: AdminSidebarProps) {
  return (
    <div className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar-background">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold text-sidebar-foreground">
          Sections
        </h2>
        <ThemeToggle />
      </div>
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter sections..."
            className="pl-9"
            data-testid="admin-section-filter"
          />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-4">
          <p
            className="text-sm text-muted-foreground"
            data-testid="admin-tree-placeholder"
          >
            Section tree will render here
          </p>
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          data-testid="admin-add-root-section"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>
    </div>
  );
}
