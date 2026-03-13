# Section Icon Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users choose an icon from a curated HeroIcons v1 set when creating/editing a section, replacing the config-driven slug-to-icon mapping.

**Architecture:** Add `icon` field to section model (backend + frontend), create an `IconPicker` component for the admin form, update navigation to read icon from section data instead of config lookup, remove `navigation.iconMap` from `site.config.json`.

**Tech Stack:** FastAPI/Pydantic (backend), React/TypeScript (frontend), HeroIcons v1 via `react-icons/hi`, MongoDB migration via pymongo-migrate.

---

### Task 1: Backend Model — Add `icon` Field

**Files:**
- Modify: `backend/models/section.py:1-73`
- Test: `backend/tests/test_sections_api.py`
- Test fixture: `backend/tests/conftest.py:562-576`

**Step 1: Write the failing test**

Add to `backend/tests/test_sections_api.py` inside `TestCreateSection`:

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_section_with_icon(
    self,
    sections_async_client,
    override_sections_database,
    sample_section_data,
    mock_auth,
    auth_headers,
):
    """Test section creation with icon field."""
    section_id = ObjectId("507f1f77bcf86cd799439011")
    override_sections_database.find_one.side_effect = [
        None,
        {**sample_section_data, "_id": section_id, "slug": "photos", "icon": "camera"},
    ]
    override_sections_database.insert_one.return_value = MagicMock(inserted_id=section_id)

    response = await sections_async_client.post(
        "/sections",
        json={
            "title": "Photos",
            "display_type": "gallery",
            "content_type": "photo_essay",
            "icon": "camera",
        },
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert response.json()["icon"] == "camera"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_section_invalid_icon(
    self,
    sections_async_client,
    override_sections_database,
    mock_auth,
    auth_headers,
):
    """Test section creation rejects invalid icon value."""
    response = await sections_async_client.post(
        "/sections",
        json={
            "title": "Photos",
            "display_type": "gallery",
            "content_type": "photo_essay",
            "icon": "nonexistent-icon",
        },
        headers=auth_headers,
    )

    assert response.status_code == 422


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_section_default_icon(
    self,
    sections_async_client,
    override_sections_database,
    sample_section_data,
    mock_auth,
    auth_headers,
):
    """Test section creation defaults icon to 'default' when omitted."""
    section_id = ObjectId("507f1f77bcf86cd799439011")
    override_sections_database.find_one.side_effect = [
        None,
        {**sample_section_data, "_id": section_id, "slug": "blog", "icon": "default"},
    ]
    override_sections_database.insert_one.return_value = MagicMock(inserted_id=section_id)

    response = await sections_async_client.post(
        "/sections",
        json={
            "title": "Blog",
            "display_type": "feed",
            "content_type": "story",
        },
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert response.json()["icon"] == "default"
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_sections_api.py::TestCreateSection::test_create_section_with_icon backend/tests/test_sections_api.py::TestCreateSection::test_create_section_invalid_icon backend/tests/test_sections_api.py::TestCreateSection::test_create_section_default_icon -v`

Expected: FAIL

**Step 3: Implement the model changes**

In `backend/models/section.py`, add the icon allowlist and `icon` field to all three models:

```python
VALID_ICONS = {
    "home", "user", "folder", "mail", "star", "heart", "tag", "globe",
    "chat", "bell", "fire", "thumb-up", "eye", "clock", "shield-check",
    "camera", "photograph", "film", "music-note",
    "book-open", "document-text", "pencil",
    "code", "lightning-bolt", "chip", "beaker", "terminal", "cube",
    "color-swatch", "sparkles", "puzzle", "academic-cap", "light-bulb",
    "map", "calendar", "collection", "clipboard-list",
    "default",
}
```

Add to `SectionBase` after `is_published`:
```python
icon: str = Field("default", description="Icon key from HeroIcons v1 set")

@field_validator("icon")
@classmethod
def validate_icon(cls, v: str) -> str:
    if v not in VALID_ICONS:
        raise ValueError(f"Invalid icon '{v}'. Must be one of: {sorted(VALID_ICONS)}")
    return v
```

Add same `icon` field + validator to `SectionCreate` and `SectionUpdate` (as `icon: str | None = None` for Update).

Update `sample_section_data` fixture in `backend/tests/conftest.py` to include `"icon": "default"`.

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker && python -m pytest backend/tests/test_sections_api.py -v`

Expected: ALL PASS

**Step 5: Format and commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker && make format
git add backend/models/section.py backend/tests/test_sections_api.py backend/tests/conftest.py
git commit -m "feat: add icon field to section model with validation"
```

---

### Task 2: Migration — Backfill Existing Sections

**Files:**
- Create: `backend/migrations/0010_add_icon_to_sections.py`

**Step 1: Write the migration**

```python
"""Add icon field to sections, backfilling from known slug mappings."""

name = "0010_add_icon_to_sections"
dependencies = ["0009_rename_image_to_photo_essay"]

SLUG_TO_ICON = {
    "blog": "home",
    "about": "user",
    "projects": "folder",
    "contact": "mail",
}


def upgrade(db):
    # Backfill known slugs with their mapped icons
    for slug, icon in SLUG_TO_ICON.items():
        db.sections.update_many(
            {"slug": slug, "icon": {"$exists": False}},
            {"$set": {"icon": icon}},
        )
    # Set all remaining sections without an icon to "default"
    db.sections.update_many(
        {"icon": {"$exists": False}},
        {"$set": {"icon": "default"}},
    )


def downgrade(db):
    db.sections.update_many(
        {},
        {"$unset": {"icon": ""}},
    )
```

**Step 2: Commit**

```bash
git add backend/migrations/0010_add_icon_to_sections.py
git commit -m "feat: migration to backfill icon field on sections"
```

---

### Task 3: Frontend Types — Add `icon` to Section Types

**Files:**
- Modify: `frontend/src/shared/types/api.ts:158-171` (Section interface)
- Modify: `frontend/src/shared/types/api.ts:247-257` (CreateSectionRequest, UpdateSectionRequest)

**Step 1: Add `icon` field to types**

In `Section` interface (after `parent_id`):
```typescript
icon: string;
```

In `CreateSectionRequest` (after `parent_id`):
```typescript
icon?: string;
```

`UpdateSectionRequest` is `Partial<CreateSectionRequest>` so it inherits automatically.

**Step 2: Commit**

```bash
git add frontend/src/shared/types/api.ts
git commit -m "feat: add icon field to frontend Section types"
```

---

### Task 4: Expand `navIcons.ts` to Full Icon Map

**Files:**
- Modify: `frontend/src/shared/lib/navIcons.ts:1-11`

**Step 1: Replace the icon map with the full 37-icon set**

```typescript
import React from 'react';
import {
    HiHome, HiUser, HiFolder, HiMail, HiStar, HiHeart, HiTag, HiGlobe,
    HiChat, HiBell, HiFire, HiThumbUp, HiEye, HiClock, HiShieldCheck,
    HiCamera, HiPhotograph, HiFilm, HiMusicNote,
    HiBookOpen, HiDocumentText, HiPencil,
    HiCode, HiLightningBolt, HiChip, HiBeaker, HiTerminal, HiCube,
    HiColorSwatch, HiSparkles, HiPuzzle, HiAcademicCap, HiLightBulb,
    HiMap, HiCalendar, HiCollection, HiClipboardList,
    HiViewGrid,
} from 'react-icons/hi';

export const SECTION_ICONS = [
    'home', 'user', 'folder', 'mail', 'star', 'heart', 'tag', 'globe',
    'chat', 'bell', 'fire', 'thumb-up', 'eye', 'clock', 'shield-check',
    'camera', 'photograph', 'film', 'music-note',
    'book-open', 'document-text', 'pencil',
    'code', 'lightning-bolt', 'chip', 'beaker', 'terminal', 'cube',
    'color-swatch', 'sparkles', 'puzzle', 'academic-cap', 'light-bulb',
    'map', 'calendar', 'collection', 'clipboard-list',
    'default',
] as const;

export type SectionIcon = (typeof SECTION_ICONS)[number];

export const iconMap: Record<SectionIcon, React.ComponentType<{ className?: string }>> = {
    home: HiHome,
    user: HiUser,
    folder: HiFolder,
    mail: HiMail,
    star: HiStar,
    heart: HiHeart,
    tag: HiTag,
    globe: HiGlobe,
    chat: HiChat,
    bell: HiBell,
    fire: HiFire,
    'thumb-up': HiThumbUp,
    eye: HiEye,
    clock: HiClock,
    'shield-check': HiShieldCheck,
    camera: HiCamera,
    photograph: HiPhotograph,
    film: HiFilm,
    'music-note': HiMusicNote,
    'book-open': HiBookOpen,
    'document-text': HiDocumentText,
    pencil: HiPencil,
    code: HiCode,
    'lightning-bolt': HiLightningBolt,
    chip: HiChip,
    beaker: HiBeaker,
    terminal: HiTerminal,
    cube: HiCube,
    'color-swatch': HiColorSwatch,
    sparkles: HiSparkles,
    puzzle: HiPuzzle,
    'academic-cap': HiAcademicCap,
    'light-bulb': HiLightBulb,
    map: HiMap,
    calendar: HiCalendar,
    collection: HiCollection,
    'clipboard-list': HiClipboardList,
    default: HiViewGrid,
};
```

**Step 2: Commit**

```bash
git add frontend/src/shared/lib/navIcons.ts
git commit -m "feat: expand icon map to 37 curated HeroIcons"
```

---

### Task 5: Update Navigation — Read Icon from Section Data

**Files:**
- Modify: `frontend/src/shared/lib/navigation.ts:1-39`
- Modify: `frontend/src/hooks/useNavSections.ts:1-51`
- Modify: `frontend/src/config/types.ts:9-28`
- Modify: `frontend/site.config.json:18-25`

**Step 1: Simplify `navigation.ts`**

Remove the config-based icon lookup. `NavIcon` type replaced by `SectionIcon` from `navIcons.ts`. `sectionToNavItem` reads `section.icon` directly.

```typescript
import { Section } from '@/shared/types/api';
import { SectionIcon, SECTION_ICONS } from '@/shared/lib/navIcons';

const VALID_ICON_SET = new Set<string>(SECTION_ICONS);

export interface NavSectionItem {
    id: string;
    slug: string;
    path: string;
    label: string;
    icon: SectionIcon;
}

export function sectionToNavItem(section: Section): NavSectionItem {
    return {
        id: section.id,
        slug: section.slug,
        path: `/${section.slug}`,
        label: section.title,
        icon: VALID_ICON_SET.has(section.icon) ? (section.icon as SectionIcon) : 'default',
    };
}

export function sectionsToNavItems(sections: Section[]): NavSectionItem[] {
    return sections.map(sectionToNavItem);
}

const DEFAULT_SECTION_SLUG = 'blog';

export function getActiveSectionSlug(pathname: string, sections: NavSectionItem[]): string {
    const firstSegment = pathname.split('/').filter(Boolean)[0];
    if (!firstSegment) return DEFAULT_SECTION_SLUG;
    return sections.find(s => s.slug === firstSegment)?.slug || DEFAULT_SECTION_SLUG;
}
```

**Step 2: Update `useNavSections.ts`**

Remove `getSiteConfig` import and `iconMap` parameter from `sectionsToNavItems` call:

```typescript
import { useState, useEffect } from 'react';
import apiClient from '@/shared/lib/api-client';
import { sectionsToNavItems, NavSectionItem } from '@/shared/lib/navigation';

let cachedSections: NavSectionItem[] | null = null;
let fetchPromise: Promise<NavSectionItem[]> | null = null;
let listeners: Array<() => void> = [];

export function invalidateNavCache() {
    cachedSections = null;
    fetchPromise = null;
    listeners.forEach(fn => fn());
}

function fetchNavSections(): Promise<NavSectionItem[]> {
    if (cachedSections) return Promise.resolve(cachedSections);
    if (fetchPromise) return fetchPromise;

    fetchPromise = apiClient.sections.navigation()
        .then((response: { items: import('@/shared/types/api').Section[] }) => {
            const items = sectionsToNavItems(response.items);
            cachedSections = items;
            return cachedSections;
        })
        .catch(() => {
            return cachedSections ?? [];
        })
        .finally(() => {
            fetchPromise = null;
        });

    return fetchPromise;
}

export function useNavSections(): NavSectionItem[] {
    const [sections, setSections] = useState<NavSectionItem[]>(cachedSections || []);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const listener = () => setVersion((v: number) => v + 1);
        listeners.push(listener);
        return () => { listeners = listeners.filter(l => l !== listener); };
    }, []);

    useEffect(() => {
        fetchNavSections().then(setSections);
    }, [version]);

    return sections;
}
```

**Step 3: Remove `navigation.iconMap` from config**

In `frontend/site.config.json`, remove the `navigation` block entirely (leaving the rest):

```json
{
  "site": { ... },
  "template": { ... },
  "hero": { ... },
  "fonts": { ... },
  "footer": { ... }
}
```

In `frontend/src/config/types.ts`, remove the `navigation` property from `SiteConfig`:

```typescript
export interface SiteConfig {
  site: {
    title: string;
    tagline: string;
    author: string;
    copyright: string;
  };
  template: TemplateConfig;
  hero: HeroConfig;
  fonts: {
    heading: string;
    body: string;
  };
  footer: {
    links: Array<{ label: string; href: string }>;
  };
}
```

**Step 4: Fix any remaining imports of `NavIcon` type**

The `Footer.tsx` and `HamburgerMenu.tsx` already use `iconMap` from `navIcons.ts` and access `section.icon` — these should continue working since `NavSectionItem.icon` is now typed as `SectionIcon` instead of `NavIcon`. Verify no compile errors.

**Step 5: Run frontend type check**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker/frontend && npx tsc --noEmit`

Expected: PASS (no type errors)

**Step 6: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker
make format
git add frontend/src/shared/lib/navigation.ts frontend/src/hooks/useNavSections.ts frontend/src/config/types.ts frontend/site.config.json
git commit -m "refactor: read icon from section data, remove config iconMap"
```

---

### Task 6: `IconPicker` Component

**Files:**
- Create: `frontend/src/components/IconPicker.tsx`

**Step 1: Build the component**

```tsx
import React from 'react';
import { SECTION_ICONS, SectionIcon, iconMap } from '@/shared/lib/navIcons';

interface IconPickerProps {
    value: SectionIcon;
    onChange: (icon: SectionIcon) => void;
    disabled?: boolean;
}

const SELECTABLE_ICONS = SECTION_ICONS.filter(icon => icon !== 'default');

export default function IconPicker({ value, onChange, disabled }: IconPickerProps) {
    return (
        <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</span>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1" data-testid="icon-picker">
                {SELECTABLE_ICONS.map(key => {
                    const Icon = iconMap[key];
                    const selected = value === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onChange(key)}
                            disabled={disabled}
                            title={key}
                            className={`p-2 rounded transition-colors ${
                                selected
                                    ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            data-testid={`icon-option-${key}`}
                            aria-pressed={selected}
                        >
                            <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/IconPicker.tsx
git commit -m "feat: add IconPicker grid component"
```

---

### Task 7: Add Icon Picker to Section Admin Forms

**Files:**
- Modify: `frontend/src/pages/admin/sections.tsx:1-320`

**Step 1: Update `SectionCreateForm`**

Add `icon` state, import `IconPicker` and `SectionIcon`, add picker to form, include `icon` in submit payload.

In the imports at top of file, add:
```typescript
import IconPicker from '@/components/IconPicker';
import { SectionIcon } from '@/shared/lib/navIcons';
```

In `SectionCreateForm`, add state:
```typescript
const [icon, setIcon] = useState<SectionIcon>('default');
```

In `handleSubmit`, add `icon` to payload:
```typescript
onSubmit({ title: title.trim(), display_type: displayType, content_type: contentType, nav_visibility: navVisibility, icon });
```

Add `<IconPicker value={icon} onChange={setIcon} disabled={disabled} />` after the select grid, before the submit button.

**Step 2: Update `SectionEditForm`**

Same pattern — add `icon` state initialized from `section.icon`, add picker, include in submit.

Add state:
```typescript
const [icon, setIcon] = useState<SectionIcon>((section.icon || 'default') as SectionIcon);
```

In `handleSubmit`, add `icon`:
```typescript
onSubmit({ title: title.trim(), display_type: displayType, content_type: contentType, nav_visibility: navVisibility, icon });
```

Add `<IconPicker value={icon} onChange={setIcon} disabled={disabled} />` in the form.

**Step 3: Update `SectionRow` to show icon**

Add icon display next to section title:
```tsx
import { iconMap } from '@/shared/lib/navIcons';
import { SectionIcon } from '@/shared/lib/navIcons';

// Inside SectionRow, before the title span:
const Icon = iconMap[(section.icon || 'default') as SectionIcon];

// In the JSX, wrap the title line:
<div>
    <Icon className="inline-block w-4 h-4 mr-1.5 text-gray-500 dark:text-gray-400" />
    <span className="font-medium text-text-primary">{section.title}</span>
    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">/{section.slug}</span>
</div>
```

**Step 4: Run type check and lint**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker/frontend && npx tsc --noEmit && npm run lint`

Expected: PASS

**Step 5: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker
make format
git add frontend/src/pages/admin/sections.tsx frontend/src/components/IconPicker.tsx
git commit -m "feat: add icon picker to section create/edit forms and admin list"
```

---

### Task 8: Run Full Test Suite

**Step 1: Backend tests**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker && make test`

Expected: ALL PASS

**Step 2: Frontend tests**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker && make test-frontend-unit`

Expected: ALL PASS

**Step 3: Format check**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker && make format-check`

Expected: PASS

**Step 4: Fix any failures, commit fixes**

---

### Task 9: Update E2E Test Data

**Files:**
- Modify: `frontend/e2e/test-data.ts` — add `icon` field to any section test data objects

Search for section objects in test data and add `icon: 'default'` (or appropriate value) to each. This ensures e2e tests don't break from the new required field.

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/section-icon-picker && make test-frontend-unit`

Commit:
```bash
git add frontend/e2e/test-data.ts
git commit -m "test: add icon field to e2e section test data"
```
