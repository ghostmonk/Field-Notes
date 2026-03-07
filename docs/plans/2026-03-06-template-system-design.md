# Template System Design

## Goal

Make Field Notes a reusable CMS where site owners can swap visual templates without touching application code. A template is a self-contained visual package that controls how the site looks. Shared logic (data fetching, auth, routing, editor, registry) remains unchanged across templates.

## Phased Approach

- **Phase A**: Layout-level templates. A config file selects a template. Templates are CSS-only packages that define tokens, component styles, and layout dimensions. Structural components (Layout, TopNav, Footer) are shared and consume CSS variables.
- **Phase B**: Visual templates. Templates can override how content components render (e.g., different card styles, different feed layouts). Template config includes component-level style overrides.
- **Phase C**: Full theme packages. Templates can bring their own display components (e.g., masonry grid instead of card-grid). Template config includes registry overrides that replace or extend default display/content components.

This document covers Phase A only.

---

## Phase A: Site Config

A `site.config.json` at the project root defines all site-level settings. Loaded at build time by Next.js. A typed `getSiteConfig()` function provides access throughout the app.

```json
{
  "site": {
    "title": "Ghostmonk",
    "tagline": "Sharing Stories, Projects and Ideas",
    "author": "Ghostmonk",
    "copyright": "(c) {year} Ghostmonk"
  },
  "template": "default",
  "brand": {
    "primary": "#4f46e5",
    "accent": "#6366f1"
  },
  "fonts": {
    "heading": "Poppins",
    "body": "Roboto Slab"
  },
  "navigation": {
    "iconMap": {
      "blog": "home",
      "about": "user",
      "projects": "folder",
      "contact": "mail"
    }
  },
  "footer": {
    "links": [
      { "label": "Privacy", "href": "/privacy" },
      { "label": "Terms", "href": "/terms" }
    ]
  },
  "layout": {
    "containerMaxWidth": "75rem"
  }
}
```

**Config loader** (`frontend/src/config/site-config.ts`): Reads and validates the config file, provides typed access. No React context needed since the data is static.

**Types** (`frontend/src/config/types.ts`): TypeScript interface for the full config shape.

---

## Phase A: Template Structure

Each template is a directory under `frontend/src/templates/`. The `default` template is created by extracting the current visual layer from the codebase. No new design work; just relocation.

```
frontend/src/
  templates/
    index.ts                ← loadTemplate(name) function
    default/
      index.ts              ← template manifest (metadata + style imports)
      styles/
        tokens.css          ← colors, fonts, spacing, radii, transitions
        components.css      ← cards, buttons, badges, prose, grid styles
        layout.css          ← layout dimensions as CSS variables
```

### tokens.css

Extracted from current `frontend/src/styles/tokens.css`. Defines the visual identity: colors, fonts, spacing scale, border radii, transitions, z-index scale. Light and dark theme variants via `:root` and `.dark` selectors.

### components.css

Extracted from current `frontend/src/styles/components.css`. Defines how UI elements look: `.card`, `.btn`, `.prose`, `.grid`, nav item styles, badge styles.

### layout.css

New file. Defines the dimensions that layout structural components consume:

```css
:root {
  --layout-nav-height: 56px;
  --layout-footer-height: 32px;
  --layout-bottom-nav-offset: 2rem;
  --layout-container-max-width: 75rem;
  --layout-bottom-offset: calc(
    var(--layout-nav-height) +
    var(--layout-bottom-nav-offset) +
    var(--layout-footer-height) +
    env(safe-area-inset-bottom)
  );
}

@media (min-width: 768px) {
  :root {
    --layout-bottom-offset: 4rem;
  }
}
```

### Template manifest (default/index.ts)

```ts
import './styles/tokens.css';
import './styles/components.css';
import './styles/layout.css';

export const template = {
  name: 'default',
};
```

### Template loader (templates/index.ts)

```ts
export async function loadTemplate(name: string) {
  return import(`./${name}/index.ts`);
}
```

### globals.css after extraction

Stripped down to Tailwind directives, CSS resets, and editor styles only. Everything template-specific is gone.

---

## Phase A: Layout Component Refactor

Structural components become config-driven shells that consume CSS variables. No hardcoded pixel values, brand strings, or icon mappings.

### Layout.tsx

Removes all pixel math and custom utility classes:

```tsx
<main
  className="container mx-auto px-6 pt-6"
  style={{ paddingBottom: 'var(--layout-bottom-offset)' }}
>
  {children}
</main>
```

The template's `layout.css` owns the padding calculation. No `!important` needed because there is no competing class.

### Footer.tsx

Reads links and copyright text from `getSiteConfig()`. The `{year}` token in copyright is replaced at render time. No hardcoded Privacy/Terms links.

### TopNav.tsx

Reads site title from config. Icon map for section navigation comes from config instead of a hardcoded constant.

### BottomNav.tsx

Same icon map change as TopNav. Both consume the same config value.

### navigation.ts

`SLUG_ICON_MAP` constant removed. `sectionToNavItem()` accepts the icon map as a parameter sourced from config.

### _document.tsx

Google Fonts `<link>` tags generated from `fonts.heading` and `fonts.body` config values instead of hardcoded Poppins/Roboto Slab.

### _app.tsx

Loads the active template on init. The template import triggers its CSS side effects, which register all the custom properties and component styles.

---

## Phase A: File Changes

### Created

| File | Purpose |
|------|---------|
| `site.config.json` | Site-level configuration |
| `frontend/src/config/site-config.ts` | Typed config loader |
| `frontend/src/config/types.ts` | Config TypeScript interfaces |
| `frontend/src/templates/index.ts` | Template loader |
| `frontend/src/templates/default/index.ts` | Default template manifest |
| `frontend/src/templates/default/styles/tokens.css` | Moved from `styles/tokens.css` |
| `frontend/src/templates/default/styles/components.css` | Moved from `styles/components.css` |
| `frontend/src/templates/default/styles/layout.css` | New: layout dimension variables |

### Modified

| File | Change |
|------|--------|
| `frontend/src/styles/globals.css` | Stripped to Tailwind directives + resets + editor styles |
| `frontend/src/layout/Layout.tsx` | CSS vars for spacing, no pixel math |
| `frontend/src/layout/Footer.tsx` | Config-driven links and copyright |
| `frontend/src/layout/TopNav.tsx` | Config-driven site title and icon map |
| `frontend/src/layout/BottomNav.tsx` | Config-driven icon map |
| `frontend/src/shared/lib/navigation.ts` | Icon map parameterized, not hardcoded |
| `frontend/src/pages/_document.tsx` | Dynamic font imports from config |
| `frontend/src/pages/_app.tsx` | Loads active template on init |

### Deleted

| File/Code | Reason |
|-----------|--------|
| `frontend/src/styles/tokens.css` | Moved to template |
| `frontend/src/styles/components.css` | Moved to template |
| `.pb-bottom-nav` class + `!important` rules | Replaced by `--layout-bottom-offset` CSS var |

### Unchanged

- `frontend/src/modules/` — all content components, registry, editor
- `frontend/src/shared/` — API client, auth, types
- `frontend/src/pages/` — routing structure (except `_app.tsx`, `_document.tsx`)
- `backend/` — nothing

---

## Phase A: Implementation Steps

1. Create `site.config.json` and typed loader (`config/site-config.ts`, `config/types.ts`)
2. Create template directory structure, move `tokens.css` and `components.css`
3. Create `layout.css` with layout dimension variables
4. Refactor `globals.css` to import active template styles instead of direct CSS
5. Refactor layout components to consume config and CSS variables
6. Refactor `_document.tsx` for dynamic font imports
7. Remove all hardcoded values: icon maps, footer links, copyright, site title
8. Delete dead code: `.pb-bottom-nav`, unused imports

---

## Phase A: Validation

- Site looks identical before and after. Zero visual regression.
- No `!important` in any CSS.
- No hardcoded brand colors, fonts, or pixel values in layout components.
- Creating a second template works by: adding a directory under `templates/`, populating its CSS files, and setting `"template": "new-name"` in `site.config.json`.
- All existing tests pass.

---

## Future Phases (Not In Scope)

### Phase B: Visual Templates

Templates can override content component styles. Template config includes component-level style tokens. StoryCard, ProjectCard, badges, etc. become styleable per-template without replacing the component.

### Phase C: Full Theme Packages

Templates can bring their own display components via registry overrides:

```ts
// templates/futuristic/config.ts
export default {
  name: 'futuristic',
  registryOverrides: {
    displays: {
      'card-grid': () => import('./displays/MasonryDisplay'),
    },
    content: {
      storyCard: () => import('./content/StoryCard'),
    },
  },
}
```

The existing registry becomes the default. Template overrides win when present.
