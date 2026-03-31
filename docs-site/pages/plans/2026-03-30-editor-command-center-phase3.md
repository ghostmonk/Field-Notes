# Editor Command Center — Phase 3: Detail Panel Content Tab

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Content tab placeholder in AdminDetailPanel with a live content table showing all items and child sections for the selected section, with status badges, sortable columns, inline actions (edit, publish/unpublish, delete), and add content/section popovers.

**Architecture:** New `useSectionContent` hook fetches content items filtered by `section_id` using existing API endpoints (stories, projects, photo_essays). Child sections come from the already-loaded `treeData` in AdminLayout. Content and child sections are merged into a unified `ContentRow[]` for the table. Publish/unpublish toggles use existing `apiClient.stories.update`, `apiClient.projects.update`, `apiClient.photoEssays.update`. Delete uses existing delete endpoints with a confirmation dialog. "Add content" navigates to `/editor?section=ID&type=CONTENT_TYPE&origin=admin`. "Add child section" opens a dialog with title/content_type/display_type fields, calls `apiClient.sections.create`.

**Tech Stack:** shadcn/ui (Table, Popover, Dialog, DropdownMenu, Select), existing apiClient, existing useSectionMutations, Tailwind CSS

---

### Task 1: Install shadcn table, popover, dialog, dropdown-menu, select, alert-dialog

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/components/admin-ui/table.tsx`
- Create: `frontend/src/components/admin-ui/popover.tsx`
- Create: `frontend/src/components/admin-ui/dialog.tsx`
- Create: `frontend/src/components/admin-ui/dropdown-menu.tsx`
- Create: `frontend/src/components/admin-ui/select.tsx`
- Create: `frontend/src/components/admin-ui/alert-dialog.tsx`

**Step 1: Install components**

```bash
cd frontend
npx shadcn@latest add table popover dialog dropdown-menu select alert-dialog --yes
```

Verify files land in `src/components/admin-ui/` (not `src/components/ui/`). If they land in `ui/`, move them.

**Step 2: Commit**

```bash
git add frontend/src/components/admin-ui/ frontend/package.json frontend/package-lock.json
git commit -m "chore: add shadcn table, popover, dialog, dropdown-menu, select, alert-dialog"
```

---

### Task 2: Unified content row type and section content hook

**Files:**
- Create: `frontend/src/modules/admin/types.ts`
- Create: `frontend/src/modules/admin/hooks/useSectionContent.ts`

The hook fetches content for a selected section. It needs to handle the four content types through a single interface. `page` type sections are static — they don't have a list endpoint, so the hook returns an empty list for them.

**Step 1: Create the types file**

```typescript
// frontend/src/modules/admin/types.ts
import { SectionContentType } from "@/shared/types/api";

export type ContentRowKind = "content" | "section";

export interface ContentRow {
  id: string;
  title: string;
  kind: ContentRowKind;
  contentType: SectionContentType | null;
  isPublished: boolean;
  updatedDate: string;
  slug: string;
}
```

**Step 2: Create the hook**

```typescript
// frontend/src/modules/admin/hooks/useSectionContent.ts
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { SectionContentType } from "@/shared/types/api";
import { ContentRow } from "../types";

interface UseSectionContentReturn {
  rows: ContentRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSectionContent(
  sectionId: string | null,
  contentType: SectionContentType | undefined
): UseSectionContentReturn {
  const { data: session } = useSession();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    if (!sectionId || !contentType || !session?.accessToken) {
      setRows([]);
      return;
    }

    // page type has no list endpoint
    if (contentType === "page") {
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        section_id: sectionId,
        limit: 100,
        offset: 0,
      };

      let items: ContentRow[] = [];

      if (contentType === "story") {
        params.include_drafts = 1;
        const response = await apiClient.stories.list(
          session.accessToken,
          params
        );
        items = response.items.map((s) => ({
          id: s.id,
          title: s.title,
          kind: "content" as const,
          contentType: "story" as const,
          isPublished: s.is_published,
          updatedDate: s.updatedDate,
          slug: s.slug,
        }));
      } else if (contentType === "project") {
        params.include_unpublished = 1;
        const response = await apiClient.projects.list(params);
        items = response.items.map((p) => ({
          id: p.id,
          title: p.title,
          kind: "content" as const,
          contentType: "project" as const,
          isPublished: "is_published" in p ? (p as any).is_published : true,
          updatedDate: "updatedDate" in p ? (p as any).updatedDate : "",
          slug: p.slug,
        }));
      } else if (contentType === "photo_essay") {
        params.include_unpublished = 1;
        const response = await apiClient.photoEssays.list(params);
        items = response.items.map((pe) => ({
          id: pe.id,
          title: pe.title,
          kind: "content" as const,
          contentType: "photo_essay" as const,
          isPublished: pe.is_published,
          updatedDate: pe.updatedDate,
          slug: pe.slug ?? "",
        }));
      }

      setRows(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch content"
      );
    } finally {
      setLoading(false);
    }
  }, [sectionId, contentType, session?.accessToken]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { rows, loading, error, refetch: fetchContent };
}
```

Note on projects: `apiClient.projects.list` returns `ProjectCard[]` which doesn't include `is_published` or `updatedDate`. The backend GET /projects endpoint does return these fields in the JSON — they're just not on the `ProjectCard` TypeScript interface. Two options: (a) cast through `any` as shown, or (b) fix the `ProjectCard` interface to include these fields. Option (b) is cleaner — do it in Step 3.

**Step 3: Add missing fields to ProjectCard interface**

In `frontend/src/shared/types/api.ts`, add `is_published`, `updatedDate`, and `createdDate` to `ProjectCard`:

```typescript
export interface ProjectCard {
    id: string;
    title: string;
    slug: string;
    summary: string;
    technologies: string[];
    image_url: string | null;
    github_url: string | null;
    live_url: string | null;
    is_featured: boolean;
    is_published: boolean;
    createdDate: string;
    updatedDate: string;
    user_id?: string;
    section_id?: string;
}
```

Then remove the `any` casts in useSectionContent — projects can use the same mapping pattern as stories:

```typescript
items = response.items.map((p) => ({
  id: p.id,
  title: p.title,
  kind: "content" as const,
  contentType: "project" as const,
  isPublished: p.is_published,
  updatedDate: p.updatedDate,
  slug: p.slug,
}));
```

**Step 4: Commit**

```bash
git add frontend/src/modules/admin/types.ts frontend/src/modules/admin/hooks/useSectionContent.ts frontend/src/shared/types/api.ts
git commit -m "feat: add useSectionContent hook and unified ContentRow type"
```

---

### Task 3: Content table component

**Files:**
- Create: `frontend/src/modules/admin/components/ContentTable.tsx`

Renders `ContentRow[]` in a shadcn Table. Columns: Title, Type, Status, Updated, Actions. Child sections get a "Section" badge in the Type column. Content items get their content_type. Status is a colored badge (Published = green outline, Draft = muted).

**Step 1: Create ContentTable**

```tsx
// frontend/src/modules/admin/components/ContentTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin-ui/table";
import { Badge } from "@/components/admin-ui/badge";
import { ContentRow } from "../types";
import { ContentActions } from "./ContentActions";

interface ContentTableProps {
  rows: ContentRow[];
  onEdit: (row: ContentRow) => void;
  onTogglePublish: (row: ContentRow) => void;
  onDelete: (row: ContentRow) => void;
  onSelectSection: (id: string) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function typeLabel(row: ContentRow): string {
  if (row.kind === "section") return "Section";
  const labels: Record<string, string> = {
    story: "Story",
    project: "Project",
    photo_essay: "Photo Essay",
    page: "Page",
  };
  return row.contentType ? labels[row.contentType] ?? row.contentType : "—";
}

export function ContentTable({
  rows,
  onEdit,
  onTogglePublish,
  onDelete,
  onSelectSection,
}: ContentTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" data-testid="content-empty">
        No content in this section.
      </p>
    );
  }

  return (
    <Table data-testid="content-table">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.kind}-${row.id}`} data-testid={`content-row-${row.id}`}>
            <TableCell className="font-medium">
              {row.kind === "section" ? (
                <button
                  className="hover:underline text-left"
                  onClick={() => onSelectSection(row.id)}
                  data-testid={`section-link-${row.id}`}
                >
                  {row.title}
                </button>
              ) : (
                row.title
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant={row.kind === "section" ? "secondary" : "outline"}
                data-testid={`type-badge-${row.id}`}
              >
                {typeLabel(row)}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={row.isPublished ? "default" : "secondary"}
                className={
                  row.isPublished
                    ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10"
                    : ""
                }
                data-testid={`status-badge-${row.id}`}
              >
                {row.isPublished ? "Published" : "Draft"}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(row.updatedDate)}
            </TableCell>
            <TableCell>
              <ContentActions
                row={row}
                onEdit={onEdit}
                onTogglePublish={onTogglePublish}
                onDelete={onDelete}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

**Step 2: Create ContentActions dropdown**

```tsx
// frontend/src/modules/admin/components/ContentActions.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin-ui/dropdown-menu";
import { Button } from "@/components/admin-ui/button";
import { MoreHorizontal, Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
import { ContentRow } from "../types";

interface ContentActionsProps {
  row: ContentRow;
  onEdit: (row: ContentRow) => void;
  onTogglePublish: (row: ContentRow) => void;
  onDelete: (row: ContentRow) => void;
}

export function ContentActions({
  row,
  onEdit,
  onTogglePublish,
  onDelete,
}: ContentActionsProps) {
  // Sections don't get inline actions — manage via tree context menu
  if (row.kind === "section") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          data-testid={`actions-trigger-${row.id}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(row)} data-testid={`action-edit-${row.id}`}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onTogglePublish(row)}
          data-testid={`action-toggle-publish-${row.id}`}
        >
          {row.isPublished ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Unpublish
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Publish
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(row)}
          data-testid={`action-delete-${row.id}`}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/modules/admin/components/ContentTable.tsx frontend/src/modules/admin/components/ContentActions.tsx
git commit -m "feat: add ContentTable and ContentActions components"
```

---

### Task 4: Content mutations hook

**Files:**
- Create: `frontend/src/modules/admin/hooks/useContentMutations.ts`

A thin hook that dispatches publish/unpublish and delete to the correct API based on content type.

**Step 1: Create the hook**

```typescript
// frontend/src/modules/admin/hooks/useContentMutations.ts
import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { SectionContentType } from "@/shared/types/api";

interface UseContentMutationsReturn {
  loading: boolean;
  error: string | null;
  togglePublish: (
    id: string,
    contentType: SectionContentType,
    currentlyPublished: boolean
  ) => Promise<boolean>;
  deleteContent: (
    id: string,
    contentType: SectionContentType
  ) => Promise<boolean>;
}

export function useContentMutations(): UseContentMutationsReturn {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePublish = useCallback(
    async (
      id: string,
      contentType: SectionContentType,
      currentlyPublished: boolean
    ): Promise<boolean> => {
      if (!session?.accessToken) return false;
      setLoading(true);
      setError(null);

      try {
        const body = { is_published: !currentlyPublished };
        if (contentType === "story") {
          await apiClient.stories.update(id, body, session.accessToken);
        } else if (contentType === "project") {
          await apiClient.projects.update(id, body, session.accessToken);
        } else if (contentType === "photo_essay") {
          await apiClient.photoEssays.update(id, body, session.accessToken);
        }
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update"
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [session?.accessToken]
  );

  const deleteContent = useCallback(
    async (
      id: string,
      contentType: SectionContentType
    ): Promise<boolean> => {
      if (!session?.accessToken) return false;
      setLoading(true);
      setError(null);

      try {
        if (contentType === "story") {
          await apiClient.stories.delete(id, session.accessToken);
        } else if (contentType === "project") {
          await apiClient.projects.delete(id, session.accessToken);
        } else if (contentType === "photo_essay") {
          await apiClient.photoEssays.delete(id, session.accessToken);
        }
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete"
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [session?.accessToken]
  );

  return { loading, error, togglePublish, deleteContent };
}
```

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/hooks/useContentMutations.ts
git commit -m "feat: add useContentMutations hook for publish/delete"
```

---

### Task 5: Delete confirmation dialog

**Files:**
- Create: `frontend/src/modules/admin/components/DeleteContentDialog.tsx`

Uses shadcn AlertDialog for destructive confirmation.

**Step 1: Create the dialog**

```tsx
// frontend/src/modules/admin/components/DeleteContentDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin-ui/alert-dialog";
import { ContentRow } from "../types";

interface DeleteContentDialogProps {
  row: ContentRow | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteContentDialog({
  row,
  onConfirm,
  onCancel,
}: DeleteContentDialogProps) {
  return (
    <AlertDialog open={!!row} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {row?.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this{" "}
            {row?.contentType ?? "item"}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="delete-cancel">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-confirm"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/components/DeleteContentDialog.tsx
git commit -m "feat: add delete confirmation dialog"
```

---

### Task 6: Add child section dialog

**Files:**
- Create: `frontend/src/modules/admin/components/AddSectionDialog.tsx`

Dialog with title, content_type, display_type fields. On submit, calls `apiClient.sections.create` with `parent_id` set to the current section.

**Step 1: Create the dialog**

```tsx
// frontend/src/modules/admin/components/AddSectionDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/admin-ui/dialog";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import {
  CreateSectionRequest,
  DisplayType,
  SectionContentType,
} from "@/shared/types/api";

interface AddSectionDialogProps {
  open: boolean;
  parentId: string;
  onSubmit: (data: CreateSectionRequest) => Promise<void>;
  onClose: () => void;
}

const CONTENT_TYPES: { value: SectionContentType; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "project", label: "Project" },
  { value: "photo_essay", label: "Photo Essay" },
  { value: "page", label: "Page" },
];

const DISPLAY_TYPES: { value: DisplayType; label: string }[] = [
  { value: "feed", label: "Feed" },
  { value: "card-grid", label: "Card Grid" },
  { value: "static-page", label: "Static Page" },
  { value: "gallery", label: "Gallery" },
];

export function AddSectionDialog({
  open,
  parentId,
  onSubmit,
  onClose,
}: AddSectionDialogProps) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<SectionContentType>("story");
  const [displayType, setDisplayType] = useState<DisplayType>("feed");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        content_type: contentType,
        display_type: displayType,
        parent_id: parentId,
      });
      setTitle("");
      setContentType("story");
      setDisplayType("feed");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Child Section</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Section title"
              data-testid="add-section-title"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Content Type</label>
            <Select
              value={contentType}
              onValueChange={(v) => setContentType(v as SectionContentType)}
            >
              <SelectTrigger data-testid="add-section-content-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Type</label>
            <Select
              value={displayType}
              onValueChange={(v) => setDisplayType(v as DisplayType)}
            >
              <SelectTrigger data-testid="add-section-display-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            data-testid="add-section-submit"
          >
            {submitting ? "Creating..." : "Create Section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/components/AddSectionDialog.tsx
git commit -m "feat: add child section dialog"
```

---

### Task 7: Wire ContentTab into AdminDetailPanel

**Files:**
- Create: `frontend/src/modules/admin/components/ContentTab.tsx`
- Modify: `frontend/src/modules/admin/components/AdminDetailPanel.tsx`
- Modify: `frontend/src/modules/admin/components/AdminLayout.tsx`

This is the orchestration layer. ContentTab receives the selected section, its content_type, and child sections from treeData. It composes useSectionContent, useContentMutations, useSectionMutations, the table, and all dialogs.

**Step 1: Create ContentTab**

```tsx
// frontend/src/modules/admin/components/ContentTab.tsx
import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Section, CreateSectionRequest, SectionContentType } from "@/shared/types/api";
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

  // Merge child sections into rows
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
```

**Step 2: Update AdminDetailPanel to pass section data to ContentTab**

The detail panel needs the full section object (not just ID) plus treeData. Update the props interface and replace the content placeholder:

```tsx
// frontend/src/modules/admin/components/AdminDetailPanel.tsx
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/admin-ui/tabs";
import { ScrollArea } from "@/components/admin-ui/scroll-area";
import { Section } from "@/shared/types/api";
import { SectionTreeData } from "../hooks/useSectionTree";
import { ContentTab } from "./ContentTab";

interface AdminDetailPanelProps {
  section: Section | null;
  treeData: SectionTreeData;
  onSelectSection: (id: string) => void;
  onRefetchTree: () => void;
}

export function AdminDetailPanel({
  section,
  treeData,
  onSelectSection,
  onRefetchTree,
}: AdminDetailPanelProps) {
  if (!section) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        data-testid="admin-dashboard"
      >
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-semibold text-foreground">
            Command Center
          </h1>
          <p className="text-lg text-muted-foreground">
            Select a section to manage its content, or view site-wide stats
            here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col" data-testid="admin-detail-panel">
      <Tabs defaultValue="content" className="flex flex-1 flex-col">
        <div className="border-b border-border px-6 pt-4">
          <TabsList>
            <TabsTrigger value="content" data-testid="admin-tab-content">
              Content
            </TabsTrigger>
            <TabsTrigger value="assets" data-testid="admin-tab-assets">
              Assets
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="admin-tab-settings">
              Settings
            </TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="flex-1">
          <TabsContent value="content" className="p-6 mt-0">
            <ContentTab
              section={section}
              treeData={treeData}
              onSelectSection={onSelectSection}
              onRefetchTree={onRefetchTree}
            />
          </TabsContent>
          <TabsContent value="assets" className="p-6 mt-0">
            <p
              className="text-muted-foreground"
              data-testid="admin-assets-placeholder"
            >
              Assets grid will render here
            </p>
          </TabsContent>
          <TabsContent value="settings" className="p-6 mt-0">
            <p
              className="text-muted-foreground"
              data-testid="admin-settings-placeholder"
            >
              Section settings will render here
            </p>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
```

**Step 3: Update AdminLayout to resolve section and pass new props**

AdminLayout currently passes `selectedSectionId` to the detail panel. It now needs to resolve the full section object from treeData and pass the new props:

```tsx
// In AdminLayout.tsx, change the AdminDetailPanel usage:

// Resolve selected section from treeData
const selectedSection = selectedSectionId ? treeData[selectedSectionId] ?? null : null;

// ... in JSX:
<AdminDetailPanel
  section={selectedSection}
  treeData={treeData}
  onSelectSection={handleSelectSection}
  onRefetchTree={refetch}
/>
```

The `SectionTreeItem` extends `Section`, so it satisfies the `Section | null` prop type.

**Step 4: Run lint and type check**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Fix any issues.

**Step 5: Commit**

```bash
git add frontend/src/modules/admin/components/ContentTab.tsx frontend/src/modules/admin/components/AdminDetailPanel.tsx frontend/src/modules/admin/components/AdminLayout.tsx
git commit -m "feat: wire content tab with table, mutations, and dialogs"
```

---

### Task 8: Manual QA and edge case fixes

**Step 1: Start dev environment**

```bash
make dev-local
```

**Step 2: Test the content tab**

Navigate to `/admin`, select a section with content. Verify:
- Content table renders with correct columns
- Child sections appear with "Section" badge
- Status badges show correctly
- "Add Content" navigates to editor with correct params
- "Add Section" opens dialog and creates child section
- Publish/unpublish toggle works and refreshes
- Delete shows confirmation and works
- Empty sections show "No content" message
- Clicking a child section in the table selects it in the sidebar

**Step 3: Fix any issues found during QA**

**Step 4: Run formatting and tests**

```bash
make format
make test-frontend-unit
```

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address phase 3 QA issues"
```

---

### Task 9: Create PR

**Step 1: Push branch**

```bash
git push -u origin ghostmonk/125_editor-command-center-phase3
```

**Step 2: Create draft PR**

```bash
gh pr create --draft \
  --title "feat: editor command center content tab (Phase 3)" \
  --body "$(cat <<'EOF'
## Summary
- Content table in admin detail panel showing all items for the selected section
- Child sections appear in the list with section type badge
- Inline actions: edit (navigates to editor), publish/unpublish toggle, delete with confirmation
- Add content button navigates to editor with section pre-selected
- Add child section dialog with title, content type, display type fields
- useSectionContent hook fetches content filtered by section_id
- useContentMutations hook handles publish/unpublish and delete across content types

## Test plan
- [ ] Select section with stories — table shows all stories with status badges
- [ ] Select section with projects — table shows projects
- [ ] Publish/unpublish toggle updates status badge
- [ ] Delete shows confirmation dialog, removes item on confirm
- [ ] Add Content navigates to editor with correct section and type params
- [ ] Add Section creates child section visible in tree sidebar
- [ ] Child sections clickable in table, navigate to that section
- [ ] Empty section shows empty state message
- [ ] Section without content_type shows empty state
EOF
)"
```
