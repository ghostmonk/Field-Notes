# Editor Command Center — Phase 4: Settings + Assets Tabs

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Settings and Assets tab placeholders in AdminDetailPanel with a section settings form (title, slug, icon, nav_visibility, display_type, sort_order, is_published) and a read-only assets grid showing images/videos referenced by content in the section.

**Architecture:** Settings tab uses a controlled form with existing `useSectionMutations.updateSection` and the existing `IconPicker` component. Display_type options are constrained by `content_type` using the existing `CONTENT_TYPE_DISPLAYS` mapping. Slug is editable — the backend auto-creates redirects on path changes. Assets tab parses `<img>` and `<video>` src attributes from content HTML (stories, projects) fetched for the section, deduplicates, and renders a thumbnail grid. No new backend endpoint needed — assets are extracted client-side from content already fetched by useSectionContent.

**Tech Stack:** shadcn/ui (Switch, Label), existing IconPicker, existing useSectionMutations, existing apiClient, Tailwind CSS

---

### Task 1: Install shadcn Switch and Label

**Files:**
- Create: `frontend/src/components/admin-ui/switch.tsx`
- Create: `frontend/src/components/admin-ui/label.tsx`

**Step 1: Install components**

```bash
cd frontend
npx shadcn@latest add switch label --yes
```

Verify files land in `src/components/admin-ui/`. Add `admin-theme` class to any portaled elements (Switch and Label don't portal, so likely no change needed — verify).

**Step 2: Commit**

```bash
git add frontend/src/components/admin-ui/ frontend/package.json frontend/package-lock.json
git commit -m "chore: add shadcn switch and label components"
```

---

### Task 2: Add slug to UpdateSectionRequest and shared constants

**Files:**
- Modify: `frontend/src/shared/types/api.ts`
- Modify: `frontend/src/shared/constants/sectionTypes.ts`

**Step 1: Fix UpdateSectionRequest to include slug**

`UpdateSectionRequest` is currently `Partial<CreateSectionRequest>`, but `CreateSectionRequest` doesn't have `slug`. The backend `SectionUpdate` model accepts `slug`. Add it:

```typescript
// In frontend/src/shared/types/api.ts
// Change:
export type UpdateSectionRequest = Partial<CreateSectionRequest>;
// To:
export type UpdateSectionRequest = Partial<CreateSectionRequest> & { slug?: string };
```

**Step 2: Add CONTENT_TYPE_DISPLAYS and NAV_VISIBILITY_OPTIONS to shared constants**

These already exist as local constants in `frontend/src/pages/admin/sections.tsx`. Extract them to the shared constants file created in Phase 3:

```typescript
// Add to frontend/src/shared/constants/sectionTypes.ts

export const CONTENT_TYPE_DISPLAYS: Record<SectionContentType, DisplayType[]> = {
  story: ["feed", "card-grid"],
  project: ["feed", "card-grid"],
  page: ["static-page"],
  photo_essay: ["gallery"],
};

export const NAV_VISIBILITY_OPTIONS: { value: NavVisibility; label: string }[] = [
  { value: "main", label: "Main" },
  { value: "secondary", label: "Secondary" },
  { value: "hidden", label: "Hidden" },
];
```

Import `NavVisibility` at the top of the file.

**Step 3: Update admin/sections.tsx to use shared constants**

Replace the local `CONTENT_TYPE_DISPLAYS`, `CONTENT_TYPES`, and `NAV_VISIBILITIES` in `frontend/src/pages/admin/sections.tsx` with imports from `@/shared/constants/sectionTypes`. Use `CONTENT_TYPE_OPTIONS` (already there) instead of the local `CONTENT_TYPES` array. Use `NAV_VISIBILITY_OPTIONS.map(o => o.value)` where the old `NAV_VISIBILITIES` string array was used, or just map the options in the select. Use the shared `CONTENT_TYPE_DISPLAYS`.

**Step 4: Commit**

```bash
git add frontend/src/shared/types/api.ts frontend/src/shared/constants/sectionTypes.ts frontend/src/pages/admin/sections.tsx
git commit -m "feat: add slug to UpdateSectionRequest, extract shared section constants"
```

---

### Task 3: Section settings form component

**Files:**
- Create: `frontend/src/modules/admin/components/SectionSettingsForm.tsx`

This is the core of the Settings tab. A form with all editable section fields. Uses shadcn admin-ui components plus the existing `IconPicker`.

**Step 1: Create the form**

```tsx
// frontend/src/modules/admin/components/SectionSettingsForm.tsx
import { useState } from "react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Label } from "@/components/admin-ui/label";
import { Switch } from "@/components/admin-ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import IconPicker from "@/components/IconPicker";
import { SectionIcon } from "@/shared/lib/navIcons";
import {
  Section,
  UpdateSectionRequest,
  DisplayType,
  NavVisibility,
} from "@/shared/types/api";
import {
  CONTENT_TYPE_DISPLAYS,
  CONTENT_TYPE_LABELS,
  DISPLAY_TYPE_OPTIONS,
  NAV_VISIBILITY_OPTIONS,
} from "@/shared/constants/sectionTypes";

interface SectionSettingsFormProps {
  section: Section;
  onSubmit: (data: UpdateSectionRequest) => Promise<void>;
  disabled?: boolean;
}

export function SectionSettingsForm({
  section,
  onSubmit,
  disabled = false,
}: SectionSettingsFormProps) {
  const [title, setTitle] = useState(section.title);
  const [slug, setSlug] = useState(section.slug);
  const [displayType, setDisplayType] = useState<DisplayType>(section.display_type);
  const [navVisibility, setNavVisibility] = useState<NavVisibility>(section.nav_visibility);
  const [sortOrder, setSortOrder] = useState(section.sort_order);
  const [isPublished, setIsPublished] = useState(section.is_published);
  const [icon, setIcon] = useState<SectionIcon>((section.icon || "default") as SectionIcon);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // content_type is locked after creation — display only
  const contentType = section.content_type;
  const validDisplayTypes = contentType
    ? CONTENT_TYPE_DISPLAYS[contentType] ?? DISPLAY_TYPE_OPTIONS.map((o) => o.value)
    : DISPLAY_TYPE_OPTIONS.map((o) => o.value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      await onSubmit({
        title: title.trim(),
        slug: slug.trim(),
        display_type: displayType,
        nav_visibility: navVisibility,
        sort_order: sortOrder,
        is_published: isPublished,
        icon,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl" data-testid="section-settings-form">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="settings-title">Title</Label>
        <Input
          id="settings-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          required
          data-testid="settings-title"
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="settings-slug">Slug</Label>
        <Input
          id="settings-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={disabled}
          data-testid="settings-slug"
        />
        <p className="text-xs text-muted-foreground">
          Changing the slug creates an automatic redirect from the old URL.
        </p>
      </div>

      {/* Content Type (read-only) */}
      <div className="space-y-2">
        <Label>Content Type</Label>
        <p className="text-sm text-muted-foreground" data-testid="settings-content-type">
          {contentType ? CONTENT_TYPE_LABELS[contentType] ?? contentType : "None"}
        </p>
      </div>

      {/* Display Type — only show if multiple valid options */}
      {validDisplayTypes.length > 1 && (
        <div className="space-y-2">
          <Label>Display Type</Label>
          <Select
            value={displayType}
            onValueChange={(v) => setDisplayType(v as DisplayType)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full" data-testid="settings-display-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {validDisplayTypes.map((dt) => (
                <SelectItem key={dt} value={dt}>
                  {DISPLAY_TYPE_OPTIONS.find((o) => o.value === dt)?.label ?? dt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Nav Visibility */}
      <div className="space-y-2">
        <Label>Navigation Visibility</Label>
        <Select
          value={navVisibility}
          onValueChange={(v) => setNavVisibility(v as NavVisibility)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full" data-testid="settings-nav-visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {NAV_VISIBILITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort Order */}
      <div className="space-y-2">
        <Label htmlFor="settings-sort-order">Sort Order</Label>
        <Input
          id="settings-sort-order"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          disabled={disabled}
          className="w-24"
          data-testid="settings-sort-order"
        />
      </div>

      {/* Icon */}
      <div className="space-y-2">
        <Label>Icon</Label>
        <IconPicker value={icon} onChange={setIcon} disabled={disabled} />
      </div>

      {/* Published Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="settings-published"
          checked={isPublished}
          onCheckedChange={setIsPublished}
          disabled={disabled}
          data-testid="settings-published"
        />
        <Label htmlFor="settings-published">Published</Label>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={disabled || saving || !title.trim()} data-testid="settings-save">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600" data-testid="settings-saved">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
```

Key design decisions:
- `content_type` is displayed but not editable — matches the backend `SectionUpdate` model which excludes it.
- `display_type` select only appears when `content_type` has multiple valid display types (story/project get feed+card-grid, page gets only static-page, photo_essay gets only gallery).
- Slug edit shows a hint about automatic redirects.
- Form state initializes from the `section` prop. When the selected section changes, the component unmounts/remounts because it's inside the tabbed panel keyed by section.

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/components/SectionSettingsForm.tsx
git commit -m "feat: add section settings form component"
```

---

### Task 4: Wire settings form into AdminDetailPanel

**Files:**
- Modify: `frontend/src/modules/admin/components/AdminDetailPanel.tsx`

**Step 1: Replace the settings placeholder**

Import `SectionSettingsForm` and `useSectionMutations`. Wire the form's `onSubmit` to `updateSection`, refetching the tree on success. Use `section.id` as a `key` on the form so it remounts when selection changes.

In AdminDetailPanel, the Settings tab content becomes:

```tsx
<TabsContent value="settings" className="p-6 mt-0">
  <SectionSettingsForm
    key={section.id}
    section={section}
    onSubmit={handleUpdateSection}
    />
</TabsContent>
```

Add the handler and hook inside AdminDetailPanel:

```tsx
import { useSectionMutations } from "@/modules/sections/hooks/useSectionMutations";
import { SectionSettingsForm } from "./SectionSettingsForm";
import { UpdateSectionRequest } from "@/shared/types/api";

// Inside the component:
const { updateSection } = useSectionMutations();

const handleUpdateSection = async (data: UpdateSectionRequest) => {
  await updateSection(section.id, data);
  onRefetchTree();
};
```

**Step 2: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 3: Commit**

```bash
git add frontend/src/modules/admin/components/AdminDetailPanel.tsx
git commit -m "feat: wire section settings form into admin detail panel"
```

---

### Task 5: Assets extraction hook

**Files:**
- Create: `frontend/src/modules/admin/hooks/useSectionAssets.ts`

This hook extracts image and video URLs from content HTML. It fetches content for the section (reusing the same API as useSectionContent), then parses `<img src="...">` and `<video><source src="...">` from the HTML content field. Returns a deduplicated list of asset URLs.

The content list endpoints return items without the full `content` HTML body — stories.list returns Story objects which DO include `content`. Projects.list returns `ProjectCard` which does NOT include `content`. For Phase 4, support stories only (the primary content type with embedded media). Projects can be added later when the endpoint supports it.

**Step 1: Create the hook**

```typescript
// frontend/src/modules/admin/hooks/useSectionAssets.ts
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/shared/lib/api-client";
import { SectionContentType } from "@/shared/types/api";

export interface AssetInfo {
  url: string;
  type: "image" | "video";
  fromContentTitle: string;
}

function extractAssets(html: string, contentTitle: string): AssetInfo[] {
  const assets: AssetInfo[] = [];
  // Match <img src="..."> and <source src="..."> (inside <video>)
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  const videoRegex = /<(?:source|video)[^>]+src="([^"]+)"/g;

  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    assets.push({ url: match[1], type: "image", fromContentTitle: contentTitle });
  }
  while ((match = videoRegex.exec(html)) !== null) {
    assets.push({ url: match[1], type: "video", fromContentTitle: contentTitle });
  }
  return assets;
}

interface UseSectionAssetsReturn {
  assets: AssetInfo[];
  loading: boolean;
  error: string | null;
}

export function useSectionAssets(
  sectionId: string | null,
  contentType: SectionContentType | undefined
): UseSectionAssetsReturn {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    // Only stories include full HTML content in list responses
    if (!sectionId || contentType !== "story" || !session?.accessToken) {
      setAssets([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.stories.list(session.accessToken, {
        section_id: sectionId,
        limit: 50,
        offset: 0,
        include_drafts: 1,
      });

      const allAssets: AssetInfo[] = [];
      for (const story of response.items) {
        if (story.content) {
          allAssets.push(...extractAssets(story.content, story.title));
        }
      }

      // Deduplicate by URL, keeping first occurrence
      const seen = new Set<string>();
      const deduped = allAssets.filter((a) => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
      });

      setAssets(deduped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  }, [sectionId, contentType, session?.accessToken]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return { assets, loading, error };
}
```

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/hooks/useSectionAssets.ts
git commit -m "feat: add useSectionAssets hook for extracting media from content HTML"
```

---

### Task 6: Assets grid component

**Files:**
- Create: `frontend/src/modules/admin/components/AssetsGrid.tsx`

A simple grid of thumbnails. Each card shows the image (or a video icon placeholder), the filename extracted from the URL, and which content item references it.

**Step 1: Create the component**

```tsx
// frontend/src/modules/admin/components/AssetsGrid.tsx
import { Film } from "lucide-react";
import { AssetInfo } from "../hooks/useSectionAssets";

interface AssetsGridProps {
  assets: AssetInfo[];
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url, "https://placeholder.local").pathname;
    return path.split("/").pop() ?? url;
  } catch {
    return url;
  }
}

export function AssetsGrid({ assets }: AssetsGridProps) {
  if (assets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" data-testid="assets-empty">
        No media assets found in this section's content.
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      data-testid="assets-grid"
    >
      {assets.map((asset) => (
        <div
          key={asset.url}
          className="rounded-lg border border-border overflow-hidden bg-muted/30"
          data-testid={`asset-card`}
        >
          {asset.type === "image" ? (
            <img
              src={asset.url}
              alt=""
              className="w-full h-32 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-32 flex items-center justify-center bg-muted">
              <Film className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="p-2 space-y-1">
            <p className="text-xs font-medium truncate">
              {filenameFromUrl(asset.url)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {asset.fromContentTitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/components/AssetsGrid.tsx
git commit -m "feat: add assets grid component for media thumbnails"
```

---

### Task 7: Wire assets tab into AdminDetailPanel

**Files:**
- Modify: `frontend/src/modules/admin/components/AdminDetailPanel.tsx`

**Step 1: Replace the assets placeholder**

Import `useSectionAssets` and `AssetsGrid`. Wire into the Assets tab:

```tsx
import { useSectionAssets } from "../hooks/useSectionAssets";
import { AssetsGrid } from "./AssetsGrid";

// Inside the component, before the return:
const { assets, loading: assetsLoading } = useSectionAssets(
  section.id,
  section.content_type as SectionContentType | undefined
);

// In the JSX, replace the assets placeholder:
<TabsContent value="assets" className="p-6 mt-0">
  {assetsLoading ? (
    <p className="text-muted-foreground text-sm">Loading...</p>
  ) : (
    <AssetsGrid assets={assets} />
  )}
</TabsContent>
```

Import `SectionContentType` from `@/shared/types/api` if not already imported.

**Step 2: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 3: Commit**

```bash
git add frontend/src/modules/admin/components/AdminDetailPanel.tsx
git commit -m "feat: wire assets grid into admin detail panel"
```

---

### Task 8: Manual QA and fixes

**Step 1: Start dev environment**

```bash
make dev-local
```

**Step 2: Test the settings tab**

Navigate to `/admin`, select a section. Click the Settings tab. Verify:
- All fields populate from the section data
- Title and slug are editable
- Content type is displayed read-only
- Display type dropdown only shows valid options for the content type
- Nav visibility dropdown works
- Sort order accepts numbers
- Icon picker opens and selects icons
- Published toggle works
- Save button calls API, shows "Saved" confirmation
- After save, the sidebar tree reflects changes (title, published status)
- Slug change: verify no 422 error, old URL should redirect (test manually)

**Step 3: Test the assets tab**

Navigate to `/admin`, select a section that has stories with images. Click the Assets tab. Verify:
- Images appear in grid with thumbnails
- Filename and content title shown under each thumbnail
- Sections without stories or without media show "No media assets" message
- Video content shows film icon placeholder

**Step 4: Run formatting and tests**

```bash
make format
make test-frontend-unit
make test
```

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address phase 4 QA issues"
```

---

### Task 9: Create PR

**Step 1: Push branch**

```bash
git push -u origin ghostmonk/125_editor-command-center-phase4
```

**Step 2: Create draft PR**

```bash
gh pr create --draft \
  --title "feat: editor command center settings and assets tabs (Phase 4)" \
  --body "$(cat <<'EOF'
## Summary
- Section settings form: title, slug (with redirect hint), display type (constrained by content type), nav visibility, sort order, icon picker, published toggle
- Content type shown read-only (locked after creation)
- Assets grid extracts images and videos from story content HTML
- Thumbnails with filename and source content title
- Shared constants extracted: CONTENT_TYPE_DISPLAYS, NAV_VISIBILITY_OPTIONS
- UpdateSectionRequest type updated to include slug field

## Test plan
- [ ] Settings tab populates all fields from selected section
- [ ] Content type is displayed but not editable
- [ ] Display type dropdown shows only valid options for the content type
- [ ] Save updates section and refreshes sidebar tree
- [ ] Slug change doesn't error (backend creates redirect)
- [ ] Icon picker works within the settings form
- [ ] Published toggle reflects in sidebar draft badge
- [ ] Assets tab shows images from story sections
- [ ] Empty sections show "No media assets" message
- [ ] Non-story sections show empty state (projects don't return content in list)
EOF
)"
```
