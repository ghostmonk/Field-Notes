# Template System Phase A — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the current visual layer into a swappable template directory, driven by a site config file, so the site looks identical but the architecture supports template swapping.

**Architecture:** A `site.config.json` at the project root defines site identity, template selection, brand colors, fonts, nav icons, and footer links. Templates live under `frontend/src/templates/<name>/` and contain only CSS (tokens, components, layout vars). Shared layout components consume CSS variables and config values instead of hardcoding them.

**Tech Stack:** Next.js, TypeScript, CSS custom properties, Tailwind CSS v4

**Design doc:** `docs/plans/2026-03-06-template-system-design.md`

**Worktree:** `.worktrees/template-design-rework` (branch: `ghostmonk/issue-129-design-rework`)

---

## Task 1: Create site config and typed loader

**Files:**
- Create: `site.config.json`
- Create: `frontend/src/config/types.ts`
- Create: `frontend/src/config/site-config.ts`
- Create: `frontend/src/config/index.ts`

**Step 1: Create the config TypeScript types**

Create `frontend/src/config/types.ts`:

```ts
export interface SiteConfig {
  site: {
    title: string;
    tagline: string;
    author: string;
    copyright: string;
  };
  template: string;
  brand: {
    primary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  navigation: {
    iconMap: Record<string, string>;
  };
  footer: {
    links: Array<{ label: string; href: string }>;
  };
  layout: {
    containerMaxWidth: string;
  };
}
```

**Step 2: Create the config file**

Create `site.config.json` at project root:

```json
{
  "site": {
    "title": "Ghostmonk",
    "tagline": "Sharing Stories, Projects and Ideas",
    "author": "Ghostmonk",
    "copyright": "\u00a9 {year} Ghostmonk"
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

**Step 3: Create the config loader**

Create `frontend/src/config/site-config.ts`:

```ts
import { SiteConfig } from './types';
import config from '../../site.config.json';

const siteConfig: SiteConfig = config as SiteConfig;

export function getSiteConfig(): SiteConfig {
  return siteConfig;
}
```

Note: This requires a `site.config.json` symlink or path alias. Since the config is at the project root (one level above `frontend/`), add a path alias in `tsconfig.json`:

```json
"@config/*": ["../site.config.*"]
```

Alternatively, the simpler approach: place a `site.config.json` symlink inside `frontend/` or use `next.config.js` to expose it. Evaluate at implementation time which is cleanest.

**Step 4: Create barrel export**

Create `frontend/src/config/index.ts`:

```ts
export { getSiteConfig } from './site-config';
export type { SiteConfig } from './types';
```

**Step 5: Verify config loads**

Add a temporary `console.log(getSiteConfig().site.title)` in `_app.tsx`, run `make dev-frontend` in the worktree, and confirm "Ghostmonk" appears in the console. Remove the console.log after verifying.

**Step 6: Commit**

```bash
git add site.config.json frontend/src/config/
git commit -m "feat: add site.config.json and typed config loader"
```

---

## Task 2: Create default template directory structure

**Files:**
- Create: `frontend/src/templates/default/styles/tokens.css`
- Create: `frontend/src/templates/default/styles/components.css`
- Create: `frontend/src/templates/default/styles/layout.css`
- Create: `frontend/src/templates/default/index.ts`
- Create: `frontend/src/templates/index.ts`

**Step 1: Extract tokens from globals.css into template tokens.css**

The current `globals.css` has all CSS custom properties defined inline in `:root` (lines 3-78) and `.dark` (lines 80-101). Extract these into `frontend/src/templates/default/styles/tokens.css`.

This file should contain:
- All `:root` custom properties (colors, fonts, spacing, radii, transitions, z-index)
- All `.dark` overrides

Do NOT include HTML/body base styles or component classes — only the variable declarations.

**Step 2: Extract component styles into template components.css**

Extract from `globals.css` into `frontend/src/templates/default/styles/components.css`:
- `.page-title`, `.section-title`
- `.container` styles
- `.card` and variants
- `.btn` and variants
- `.badge` and variants
- `.nav` styles (`.nav`, `.nav__container`, `.nav__links`, etc.)
- `.bottom-nav` and all related styles
- `.grid` and `.grid--responsive`
- `.story-header`, `.story-title`, `.story-content`, `.story-excerpt`
- `.error-state`, `.empty-state`
- `.prose` and variants
- Image loading / shimmer styles
- Story progress bar styles
- All responsive media queries for the above

**Step 3: Create layout.css with layout dimension variables**

Create `frontend/src/templates/default/styles/layout.css`:

```css
:root {
  --layout-nav-height: 56px;
  --layout-footer-height: 32px;
  --layout-bottom-nav-offset: 2rem;
  --layout-container-max-width: 75rem;
  --layout-content-padding: 1.5rem;
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

**Step 4: Create template manifest**

Create `frontend/src/templates/default/index.ts`:

```ts
import './styles/tokens.css';
import './styles/components.css';
import './styles/layout.css';

export const template = {
  name: 'default',
};
```

**Step 5: Create template loader**

Create `frontend/src/templates/index.ts`:

```ts
import { getSiteConfig } from '@/config';

export async function loadTemplate(): Promise<void> {
  const { template } = getSiteConfig();
  await import(`./${template}/index.ts`);
}
```

**Step 6: Commit**

```bash
git add frontend/src/templates/
git commit -m "feat: create default template with extracted tokens, components, and layout CSS"
```

---

## Task 3: Refactor globals.css

**Files:**
- Modify: `frontend/src/styles/globals.css`

**Step 1: Strip globals.css down to framework-only concerns**

After extracting tokens and components into the template, `globals.css` should contain ONLY:

1. `@import "tailwindcss"` — Tailwind directives
2. HTML/body base resets (box-sizing, scroll-behavior, font smoothing)
3. Typography base styles (h1-h6 sizing, paragraph spacing)
4. `.pb-safe` utility (safe area inset)
5. Editor styles (ProseMirror / TipTap) — these are editor-specific, not template-specific

Remove from globals.css:
- All `:root` custom property declarations (moved to template tokens.css)
- All `.dark` overrides (moved to template tokens.css)
- All component classes: `.card`, `.btn`, `.badge`, `.nav`, `.bottom-nav`, `.grid`, `.story-*`, `.prose`, `.error-state`, `.empty-state`, shimmer, progress bar (moved to template components.css)
- The `.pb-bottom-nav` class and its `!important` rules (replaced by `--layout-bottom-offset` CSS var)
- `.page-title`, `.section-title`, `.container` styles (moved to template components.css)

**Step 2: Verify the site still renders correctly**

Run `make dev-frontend` in the worktree. The site should look identical — the template CSS is now loaded via the template manifest import, and globals.css handles only resets and Tailwind.

If styles are missing, the template CSS files are not being imported. Check that `_app.tsx` loads the template (Task 5).

**Step 3: Commit**

```bash
git add frontend/src/styles/globals.css
git commit -m "refactor: strip globals.css to framework concerns only"
```

---

## Task 4: Refactor layout components to use CSS variables and config

**Files:**
- Modify: `frontend/src/layout/Layout.tsx`
- Modify: `frontend/src/layout/Footer.tsx`
- Modify: `frontend/src/layout/TopNav.tsx`
- Modify: `frontend/src/layout/BottomNav.tsx`
- Modify: `frontend/src/shared/lib/navigation.ts`

**Step 1: Refactor Layout.tsx**

Replace hardcoded padding with CSS variable:

```tsx
import React, { ReactNode } from "react";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import Footer from "./Footer";

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-dvh transition-colors duration-300" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>
            <TopNav />
            <main
                className="container mx-auto px-6 pt-6"
                style={{ paddingBottom: 'var(--layout-bottom-offset)' }}
            >
                {children}
            </main>
            <Footer />
            <BottomNav />
        </div>
    );
};

export default Layout;
```

**Step 2: Refactor Footer.tsx**

Replace hardcoded links and copyright with config:

```tsx
import React from 'react';
import Link from 'next/link';
import { getSiteConfig } from '@/config';

const Footer: React.FC = () => {
    const { site, footer } = getSiteConfig();
    const copyrightText = site.copyright.replace('{year}', String(new Date().getFullYear()));

    return (
        <footer
            className="fixed left-0 right-0 bottom-0 py-2 px-4 text-xs z-[55] pointer-events-none"
            style={{
                backgroundColor: 'var(--color-surface-primary)',
                borderTop: '1px solid var(--color-border-primary)',
                color: 'var(--color-text-secondary)'
            }}
        >
            <div className="container mx-auto flex justify-between items-center">
                <span className="pointer-events-auto">{copyrightText}</span>
                <div className="flex gap-4">
                    {footer.links.map((link) => (
                        <Link key={link.href} href={link.href} className="hover:underline pointer-events-auto">
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
```

**Step 3: Refactor navigation.ts to accept icon map**

```ts
import { Section } from '@/shared/types/api';

export type NavIcon = 'home' | 'user' | 'folder' | 'mail' | 'default';

export interface NavSectionItem {
    id: string;
    slug: string;
    path: string;
    label: string;
    icon: NavIcon;
}

export function sectionToNavItem(section: Section, iconMap: Record<string, string>): NavSectionItem {
    return {
        id: section.id,
        slug: section.slug,
        path: `/${section.slug}`,
        label: section.title,
        icon: (iconMap[section.slug] || 'default') as NavIcon,
    };
}

export function sectionsToNavItems(sections: Section[], iconMap: Record<string, string>): NavSectionItem[] {
    return sections.map(s => sectionToNavItem(s, iconMap));
}

const DEFAULT_SECTION_SLUG = 'blog';

export function getActiveSectionSlug(pathname: string, sections: NavSectionItem[]): string {
    const firstSegment = pathname.split('/').filter(Boolean)[0];
    if (!firstSegment) return DEFAULT_SECTION_SLUG;
    return sections.find(s => s.slug === firstSegment)?.slug || DEFAULT_SECTION_SLUG;
}
```

**Step 4: Update useNavSections hook to pass icon map**

Find `frontend/src/hooks/useNavSections.ts` and update the call to `sectionsToNavItems` to pass `getSiteConfig().navigation.iconMap`.

**Step 5: Refactor TopNav.tsx**

Replace hardcoded site title with `getSiteConfig().site.title`. The icon map is already handled via the updated `useNavSections` hook.

**Step 6: Verify all navigation and footer render correctly**

Run `make dev-frontend`, check:
- Desktop nav shows correct section links with icons
- Mobile bottom nav shows correct section links with icons
- Footer shows copyright with current year and correct links
- Site title in nav matches config

**Step 7: Commit**

```bash
git add frontend/src/layout/ frontend/src/shared/lib/navigation.ts frontend/src/hooks/useNavSections.ts
git commit -m "refactor: layout components consume config and CSS variables"
```

---

## Task 5: Refactor _app.tsx and _document.tsx

**Files:**
- Modify: `frontend/src/pages/_app.tsx`
- Modify: `frontend/src/pages/_document.tsx`

**Step 1: Load template in _app.tsx**

Add the template import at the top of `_app.tsx`, before the component definition. Since the template manifest has CSS side-effect imports, this loads all template styles:

```ts
import '../styles/globals.css';
import { getSiteConfig } from '@/config';

// Load active template CSS
const templateName = getSiteConfig().template;
require(`../templates/${templateName}/index.ts`);
```

Note: Use `require` for synchronous loading at module level, or use a dynamic import in a top-level await if the build supports it. The key requirement is that template CSS loads before first render. Evaluate the cleanest approach at implementation time — a static import of the default template is acceptable for Phase A if dynamic loading adds complexity:

```ts
import '../templates/default';
```

With a comment noting this will become dynamic in Phase B.

**Step 2: Refactor _document.tsx for dynamic fonts**

Replace hardcoded Poppins/Roboto Slab font imports with config-driven ones:

```tsx
import { Html, Head, Main, NextScript } from 'next/document';
import siteConfig from '../../site.config.json';

const fontFamilies = [siteConfig.fonts.heading, siteConfig.fonts.body]
  .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
  .map(f => f.replace(/ /g, '+'))
  .join('&family=');

const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@300;400;500;600;700&display=swap`;

export default function Document() {
  return (
    <Html lang="en" className="dark" data-theme="dark">
      <Head>
        <meta charSet="utf-8" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={fontUrl} rel="stylesheet" />
      </Head>
      <body style={{ backgroundColor: '#0f172a' }} className="text-foreground">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

Note: `_document.tsx` runs server-side only. Import the JSON config directly since `getSiteConfig()` may rely on client-side module resolution. Use the raw JSON import.

**Step 3: Verify fonts load correctly**

Run `make dev-frontend`, inspect the `<head>` in browser DevTools. Confirm:
- Google Fonts URL contains the fonts from config
- No hardcoded Poppins/Roboto Slab references remain in `_document.tsx`
- Fonts render correctly on the page

**Step 4: Commit**

```bash
git add frontend/src/pages/_app.tsx frontend/src/pages/_document.tsx
git commit -m "refactor: dynamic template loading and config-driven font imports"
```

---

## Task 6: Clean up dead code and unused files

**Files:**
- Delete: `frontend/src/styles/tokens.css` (if not imported anywhere after refactor)
- Delete: `frontend/src/styles/base.css` (if not imported anywhere after refactor)
- Delete: `frontend/src/styles/components.css` (if not imported anywhere after refactor)
- Modify: `frontend/src/hooks/useMediaQuery.ts` — remove `useIsMobile` if unused

**Step 1: Verify no remaining imports of old style files**

Search the codebase for imports of `tokens.css`, `base.css`, `components.css` from the old `styles/` location. If globals.css previously imported them, those imports are now gone. If any other file imports them, update to import from the template path or remove.

**Step 2: Delete unused style files**

Only delete files confirmed to have zero imports. The separate `tokens.css`, `base.css`, `components.css` in `frontend/src/styles/` appear to be parallel copies that aren't the actual source (globals.css is). Verify and delete.

**Step 3: Remove useIsMobile if unused**

Search for `useIsMobile` imports. If only referenced in its own definition file and the hooks barrel export, remove it from both. Keep `useIsDesktop` and `useMediaQuery` if they're used elsewhere.

**Step 4: Verify no regressions**

Run `make dev-frontend`, check all pages:
- Home page (blog feed)
- Projects page (card grid)
- Privacy / Terms pages
- About / Contact pages
- Mobile viewport (bottom nav, footer, padding)
- Desktop viewport (top nav, footer, no bottom nav)
- Dark mode toggle works
- Light mode toggle works

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead style files and unused hooks"
```

---

## Task 7: Validation — create a trivial second template

**Files:**
- Create: `frontend/src/templates/debug/styles/tokens.css`
- Create: `frontend/src/templates/debug/styles/components.css`
- Create: `frontend/src/templates/debug/styles/layout.css`
- Create: `frontend/src/templates/debug/index.ts`

**Step 1: Create a debug template**

Copy the default template directory. Change one or two obvious values in `tokens.css` — e.g., set brand primary to red (`#dc2626`), change heading font to `monospace`.

**Step 2: Switch site.config.json to use the debug template**

```json
"template": "debug"
```

**Step 3: Verify the site renders with the debug template**

Run `make dev-frontend`. Confirm:
- Brand color is now red
- Heading font changed
- Everything else still works (nav, footer, routing, content)

**Step 4: Switch back to default**

```json
"template": "default"
```

**Step 5: Delete the debug template**

```bash
rm -rf frontend/src/templates/debug/
```

**Step 6: Final commit**

```bash
git add -A
git commit -m "test: validate template swapping works, clean up debug template"
```

---

## Task 8: Run all tests and push

**Step 1: Run backend tests**

```bash
cd /path/to/worktree && source ~/Documents/venvs/field-notes/bin/activate && pytest -q
```

Expected: 221 passed

**Step 2: Run frontend lint**

```bash
cd /path/to/worktree/frontend && npm run lint
```

Expected: No errors

**Step 3: Push branch**

```bash
git push -u origin ghostmonk/issue-129-design-rework
```

**Step 4: Create PR**

Reference issue #129 in the PR body.
