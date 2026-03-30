# Editor Command Center — Phase 2: Section Tree Sidebar

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the sidebar placeholder with a live section tree using @headless-tree, with expand/collapse, selection, drag-and-drop reorder/reparent, right-click context menu, and content count badges.

**Architecture:** Fetch all sections flat from `GET /api/sections?limit=100&include_unpublished=true`, build tree structure client-side from `parent_id` relationships, render with @headless-tree/react hook. Selection syncs to URL query params (already wired in Phase 1). Drag-and-drop calls `PUT /api/sections/{id}` to update `sort_order` or `parent_id`. Context menu uses shadcn ContextMenu component wrapping each tree node.

**Tech Stack:** @headless-tree/core, @headless-tree/react, shadcn/ui (ContextMenu, Badge), Tailwind CSS, existing apiClient.sections

---

### Task 1: Install @headless-tree

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install packages**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/editor-phase2/frontend
npm install @headless-tree/core @headless-tree/react
```

**Step 2: Add shadcn context-menu component**

```bash
npx shadcn@latest add context-menu badge --yes
```

Verify files land in `src/components/admin-ui/` (not `src/components/ui/`).

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/admin-ui/
git commit -m "chore: install headless-tree and add shadcn context-menu, badge"
```

---

### Task 2: Section tree data hook

**Files:**
- Create: `frontend/src/modules/admin/hooks/useSectionTree.ts`

Build a hook that fetches all sections and transforms them into the data structure headless-tree expects.

**Step 1: Create the hook**

```typescript
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

  // First pass: create all items with empty childrenIds
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

  // Second pass: populate childrenIds, sorted by sort_order
  for (const section of sections) {
    const parentId = section.parent_id ?? "root";
    if (parentId !== "root" && data[parentId]) {
      data[parentId].childrenIds.push(section.id);
    }
  }

  // Sort children by sort_order
  for (const item of Object.values(data)) {
    item.childrenIds.sort((a, b) => (data[a]?.sort_order ?? 0) - (data[b]?.sort_order ?? 0));
  }

  // Create virtual root
  const rootChildren = sections
    .filter(s => !s.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(s => s.id);

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
      setError(err instanceof Error ? err.message : "Failed to fetch sections");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  return { treeData, loading, error, refetch: fetchSections };
}
```

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/hooks/useSectionTree.ts
git commit -m "feat: add useSectionTree hook for fetching and structuring section data"
```

---

### Task 3: Section tree component

**Files:**
- Create: `frontend/src/modules/admin/components/SectionTree.tsx`
- Modify: `frontend/src/modules/admin/components/AdminSidebar.tsx`

Build the tree component using @headless-tree/react, render inside AdminSidebar.

**Step 1: Create SectionTree component**

```tsx
import { useTree } from "@headless-tree/react";
import {
  syncDataLoaderFeature,
  selectionFeature,
  hotkeysCoreFeature,
  dragAndDropFeature,
} from "@headless-tree/core";
import { SectionTreeData } from "../hooks/useSectionTree";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionTreeProps {
  data: SectionTreeData;
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
}

export function SectionTree({ data, selectedSectionId, onSelectSection }: SectionTreeProps) {
  const tree = useTree<SectionTreeData[string]>({
    rootItemId: "root",
    getItemName: (item) => item.getItemData().title,
    isItemFolder: (item) => item.getItemData().childrenIds.length > 0,
    canReorderItems: true,
    onPrimaryAction: (item) => {
      const id = item.getId();
      onSelectSection(id === "root" ? null : id);
    },
    dataLoader: {
      getItem: (itemId) => data[itemId],
      getChildren: (itemId) => data[itemId]?.childrenIds ?? [],
    },
    features: [
      syncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      dragAndDropFeature,
    ],
  });

  if (!data["root"]) return null;

  return (
    <div
      ref={tree.registerElement}
      className="py-2"
      data-testid="admin-section-tree"
    >
      {tree.getItems().map((item) => {
        if (item.getId() === "root") return null;
        const itemData = item.getItemData();
        const level = item.getItemMeta().level - 1;
        const isSelected = item.getId() === selectedSectionId;
        const isFolder = itemData.childrenIds.length > 0;

        return (
          <button
            key={item.getId()}
            {...item.getProps()}
            ref={item.registerElement}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isSelected && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              item.isDraggingOver() && "bg-accent/50",
              !itemData.is_published && "opacity-60",
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            data-testid={`admin-tree-node-${itemData.slug}`}
          >
            {isFolder ? (
              item.isExpanded() ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{itemData.title}</span>
            {!itemData.is_published && (
              <span className="ml-auto text-xs text-muted-foreground">Draft</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Wire SectionTree into AdminSidebar**

Replace the placeholder in `AdminSidebar.tsx`. The sidebar receives tree data from props (fetched by parent). Update the props interface:

```tsx
import { ScrollArea } from "@/components/admin-ui/scroll-area";
import { Input } from "@/components/admin-ui/input";
import { Button } from "@/components/admin-ui/button";
import { Separator } from "@/components/admin-ui/separator";
import { Plus, Search } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { SectionTree } from "./SectionTree";
import { SectionTreeData } from "../hooks/useSectionTree";
import { useState } from "react";

interface AdminSidebarProps {
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  treeData: SectionTreeData;
  loading: boolean;
}

export function AdminSidebar({
  selectedSectionId,
  onSelectSection,
  treeData,
  loading,
}: AdminSidebarProps) {
  const [filter, setFilter] = useState("");

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
            <p className="text-sm text-muted-foreground">Loading sections...</p>
          </div>
        ) : (
          <SectionTree
            data={treeData}
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
          />
        )}
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
```

**Step 3: Update AdminLayout to pass tree data**

Modify `AdminLayout.tsx` to use `useSectionTree` and pass data to sidebar:

```tsx
import { AdminDesktopGate } from "./AdminDesktopGate";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDetailPanel } from "./AdminDetailPanel";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { applyStoredTheme } from "@/lib/theme";
import { useSectionTree } from "../hooks/useSectionTree";

export function AdminLayout() {
  const router = useRouter();
  const selectedSectionId = (router.query.section as string) ?? null;
  const { treeData, loading } = useSectionTree();

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
        />
        <AdminDetailPanel selectedSectionId={selectedSectionId} />
      </div>
    </AdminDesktopGate>
  );
}
```

**Step 4: Run TypeScript check and format**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/editor-phase2/frontend && npx tsc --noEmit
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/editor-phase2 && make format
```

Fix any issues. The headless-tree API may need type adjustments based on the actual v1.6.3 exports.

**Step 5: Commit**

```bash
git add frontend/src/modules/admin/
git commit -m "feat: add section tree component with headless-tree"
```

---

### Task 4: Right-click context menu

**Files:**
- Modify: `frontend/src/modules/admin/components/SectionTree.tsx`

Wrap each tree node with shadcn ContextMenu. Menu items: Edit settings, Add content, Add child section, Delete.

**Step 1: Add context menu to tree nodes**

Import shadcn ContextMenu components from `@/components/admin-ui/context-menu`. Wrap each tree node `<button>` in a `<ContextMenu>` with `<ContextMenuTrigger>` and `<ContextMenuContent>`.

Menu items (all placeholder handlers for now):
- "Add Content" — will navigate to `/editor?section_id={id}`
- "Add Child Section" — will open create section dialog (Phase 3)
- "Edit Settings" — will switch to settings tab (Phase 4)
- "Delete" — will call delete API with confirmation

Each item gets a `data-testid` for future e2e testing.

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/components/SectionTree.tsx
git commit -m "feat: add right-click context menu to section tree nodes"
```

---

### Task 5: Drag-and-drop reorder/reparent

**Files:**
- Modify: `frontend/src/modules/admin/components/SectionTree.tsx`
- Create: `frontend/src/modules/admin/hooks/useSectionReorder.ts`

Wire headless-tree's drag-and-drop to call the backend API for reorder (sort_order) and reparent (parent_id).

**Step 1: Create useSectionReorder hook**

```typescript
import { useSession } from "next-auth/react";
import { apiClient } from "@/shared/lib/api-client";

export function useSectionReorder(onComplete: () => void) {
  const { data: session } = useSession();

  const reorder = async (sectionId: string, newParentId: string | null, newSortOrder: number) => {
    if (!session?.accessToken) return;
    try {
      const updates: Record<string, unknown> = { sort_order: newSortOrder };
      if (newParentId !== undefined) {
        updates.parent_id = newParentId;
      }
      await apiClient.sections.update(sectionId, updates, session.accessToken);
      onComplete();
    } catch (err) {
      console.error("Failed to reorder section:", err);
    }
  };

  return { reorder };
}
```

**Step 2: Wire drag-and-drop events in SectionTree**

Add `onDrop` handler to the tree config that extracts the dragged item, new parent, and new position, then calls `reorder`. The headless-tree `dragAndDropFeature` provides drop event data.

The key integration point: when a drop occurs, compute the new `sort_order` based on the item's position among its new siblings, then call `PUT /api/sections/{id}` with updated `sort_order` and (if reparented) `parent_id`. After success, call `refetch()` to refresh the tree.

**Step 3: Commit**

```bash
git add frontend/src/modules/admin/hooks/useSectionReorder.ts frontend/src/modules/admin/components/SectionTree.tsx
git commit -m "feat: wire drag-and-drop reorder/reparent to backend API"
```

---

### Task 6: Filter functionality

**Files:**
- Modify: `frontend/src/modules/admin/components/AdminSidebar.tsx`
- Modify: `frontend/src/modules/admin/components/SectionTree.tsx`

The filter input already has state wired. Pass the filter string to SectionTree and use it to filter visible nodes.

**Step 1: Filter tree data**

In SectionTree, filter the rendered items based on whether the item's title contains the filter string (case-insensitive). When filtering, auto-expand all nodes so matches in nested sections are visible.

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/components/
git commit -m "feat: add filter functionality to section tree"
```

---

### Task 7: Formatting, tests, and manual verification

**Step 1: Run formatter and type check**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/editor-phase2 && make format
cd frontend && npx tsc --noEmit
```

**Step 2: Run unit tests**

```bash
make test-frontend-unit
```

**Step 3: Start dev server and manually verify**

```bash
make dev-local
```

Verify:
1. `/admin` shows the section tree in the sidebar with real sections from the database
2. Clicking a section selects it and updates the URL
3. Expand/collapse works for sections with children
4. Right-click shows context menu
5. Drag a section to reorder — verify sort_order updates
6. Drag a section onto another section to reparent — verify parent_id updates
7. Type in filter input — tree filters to matching sections
8. Light and dark mode both render correctly

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: formatting and adjustments for section tree"
```
