# Phase 1: Documentation Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up a Nextra documentation site deployed to GitHub Pages.

**Architecture:** Standalone Next.js app using Nextra theme in `docs-site/`. Reads from MDX files, exports static HTML. GitHub Actions builds and deploys to GitHub Pages on push to main.

**Tech Stack:** Nextra 3.x, Next.js 14, MDX, GitHub Pages, GitHub Actions

---

## Task 1: Initialize Nextra Project

**Files:**
- Create: `docs-site/package.json`
- Create: `docs-site/next.config.mjs`
- Create: `docs-site/theme.config.tsx`
- Create: `docs-site/.gitignore`
- Create: `docs-site/tsconfig.json`

**Step 1: Create docs-site directory**

```bash
mkdir -p docs-site
```

**Step 2: Create package.json**

Create `docs-site/package.json`:

```json
{
  "name": "turbulence-docs",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "export": "next build"
  },
  "dependencies": {
    "next": "^14.2.21",
    "nextra": "^3.2.5",
    "nextra-theme-docs": "^3.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 3: Create next.config.mjs**

Create `docs-site/next.config.mjs`:

```javascript
import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

export default withNextra({
  output: 'export',
  basePath: '/turbulence',
  images: {
    unoptimized: true,
  },
})
```

**Step 4: Create theme.config.tsx**

Create `docs-site/theme.config.tsx`:

```tsx
import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 700 }}>Turbulence Docs</span>,
  project: {
    link: 'https://github.com/yourusername/turbulence',
  },
  docsRepositoryBase: 'https://github.com/yourusername/turbulence/tree/main/docs-site',
  footer: {
    content: 'Turbulence Documentation',
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Turbulence Docs',
    }
  },
}

export default config
```

**Step 5: Create tsconfig.json**

Create `docs-site/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "incremental": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.mdx"],
  "exclude": ["node_modules"]
}
```

**Step 6: Create .gitignore**

Create `docs-site/.gitignore`:

```
node_modules
.next
out
.DS_Store
```

**Step 7: Commit**

```bash
git add docs-site/
git commit -m "feat(docs): initialize Nextra documentation site"
```

---

## Task 2: Create Documentation Pages Structure

**Files:**
- Create: `docs-site/pages/_meta.json`
- Create: `docs-site/pages/index.mdx`
- Create: `docs-site/pages/architecture/_meta.json`
- Create: `docs-site/pages/architecture/overview.mdx`
- Create: `docs-site/pages/architecture/folder-structure.mdx`
- Create: `docs-site/pages/architecture/component-patterns.mdx`
- Create: `docs-site/pages/architecture/ssr-strategy.mdx`
- Create: `docs-site/pages/architecture/testing.mdx`
- Create: `docs-site/pages/architecture/future-direction.mdx`
- Create: `docs-site/pages/adr/_meta.json`
- Create: `docs-site/pages/guides/_meta.json`

**Step 1: Create pages directory**

```bash
mkdir -p docs-site/pages/architecture docs-site/pages/adr docs-site/pages/guides
```

**Step 2: Create root _meta.json**

Create `docs-site/pages/_meta.json`:

```json
{
  "index": "Introduction",
  "architecture": "Architecture",
  "adr": "Decision Records",
  "guides": "Guides"
}
```

**Step 3: Create index.mdx**

Create `docs-site/pages/index.mdx`:

```mdx
# Turbulence Documentation

Welcome to the Turbulence documentation. This site covers the architecture, design decisions, and development guides for the Turbulence blog platform.

## Quick Links

- [Architecture Overview](/architecture/overview) - High-level system design
- [Folder Structure](/architecture/folder-structure) - Code organization
- [Component Patterns](/architecture/component-patterns) - How to build components
- [SSR Strategy](/architecture/ssr-strategy) - Server-side rendering approach

## About Turbulence

Turbulence is a modern blog/content management system with a Next.js frontend and FastAPI backend. It allows authenticated users to create and publish rich text content with image uploads.

## Tech Stack

**Frontend:**
- Next.js (Pages Router)
- TypeScript
- TipTap rich text editor
- Tailwind CSS

**Backend:**
- FastAPI (Python)
- MongoDB
- Google Cloud Storage
```

**Step 4: Create architecture/_meta.json**

Create `docs-site/pages/architecture/_meta.json`:

```json
{
  "overview": "Overview",
  "folder-structure": "Folder Structure",
  "component-patterns": "Component Patterns",
  "ssr-strategy": "SSR Strategy",
  "testing": "Testing",
  "future-direction": "Future Direction"
}
```

**Step 5: Create architecture/overview.mdx**

Create `docs-site/pages/architecture/overview.mdx`:

```mdx
# Architecture Overview

## Guiding Principles

### Patterns Over Frameworks

Every architectural decision is explained in terms of the underlying pattern first, then how React/Next.js expresses it. "Separation of concerns" is the pattern; "custom hooks for logic, components for UI" is the React expression.

### Explicit Over Implicit

React has many "magic" conventions (file-based routing, automatic code splitting, hydration). The documentation makes these explicit - what happens, when, and why it matters.

### One Way to Do Things

React offers many paths to the same outcome. This architecture documents ONE chosen pattern for each concern, with reasoning. No guessing.

### Teachable and Transferable

Each pattern documented here should be applicable to other projects with minimal translation. The docs serve as a template, not just a reference.

## Layer Responsibilities

| Layer | Purpose | Data Flow |
|-------|---------|-----------|
| `pages/` | Routing, SSR decisions | Receives SSR data, passes to modules |
| `modules/` | Feature implementation | Composes shared components, uses hooks |
| `shared/` | Reusable code | Imported by modules |
| `rendering/` | SSR/CSR patterns | Used by pages |
| `layout/` | App shell | Wraps all pages |

**Data flows DOWN through layers.** Pages compose modules. Modules compose shared. Never upward.
```

**Step 6: Create architecture/folder-structure.mdx**

Create `docs-site/pages/architecture/folder-structure.mdx`:

```mdx
# Folder Structure

```
frontend/src/
│
├── pages/                    # ROUTING LAYER (thin)
│   ├── api/                  # API routes
│   └── [routes].tsx          # SSR + compose from modules
│
├── modules/                  # FEATURE MODULES
│   ├── stories/              # Story feature
│   │   ├── components/       # UI for this module
│   │   ├── hooks/            # Logic for this module
│   │   ├── pages/            # Page compositions
│   │   ├── types/            # Types scoped to module
│   │   └── index.ts          # Public API
│   ├── editor/
│   ├── engagement/
│   └── static/
│
├── shared/                   # CROSS-MODULE CODE
│   ├── components/           # Reusable UI
│   ├── hooks/                # Shared logic
│   ├── lib/                  # Infrastructure
│   ├── types/                # Shared types
│   └── utils/                # Pure functions
│
├── rendering/                # SSR PATTERNS
│   ├── server/               # getServerSideProps helpers
│   └── client/               # Client-only patterns
│
└── layout/                   # APP SHELL
    ├── Layout.tsx
    ├── TopNav.tsx
    └── Footer.tsx
```

## Module Structure

Each module is self-contained:

```
modules/stories/
├── components/
│   ├── StoryCard.tsx
│   ├── StoryContent.tsx
│   └── index.ts
├── hooks/
│   ├── useFetchStory.ts
│   └── index.ts
├── pages/
│   ├── StoryPage.tsx
│   └── index.ts
├── types/
│   └── story.ts
└── index.ts                  # Public exports
```

## Decision Guide

| Question | Answer | Location |
|----------|--------|----------|
| Used by 2+ modules? | Yes | `shared/` |
| Composes a full view? | Yes | `modules/*/pages/` |
| Feature-specific? | Yes | `modules/*/components/` |
| Pure function, no side effects? | Yes | `shared/utils/` |
| External service integration? | Yes | `shared/lib/` |
```

**Step 7: Create architecture/component-patterns.mdx**

Create `docs-site/pages/architecture/component-patterns.mdx`:

```mdx
# Component Patterns

Three types of components, each with a clear role.

## 1. Page Components

Location: `modules/*/pages/`

Compose features into a complete view. No direct data fetching - receive data via props from SSR or use hooks.

```tsx
// modules/stories/pages/StoryPage.tsx
export function StoryPage({ story, error, ogImage, excerpt }: StoryPageProps) {
  if (error) return <ErrorState error={error} />;

  return (
    <>
      <StoryMeta story={story} ogImage={ogImage} excerpt={excerpt} />
      <StoryLayout>
        <StoryContent story={story} />
        <StoryEngagement />
      </StoryLayout>
    </>
  );
}
```

**Pattern:** Composition only. Handles error/loading states. Delegates everything else.

## 2. Feature Components

Location: `modules/*/components/`

Implement specific functionality. May use hooks for logic. Scoped to their module.

```tsx
// modules/engagement/components/ReactionBar.tsx
export function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  return (
    <div className="flex gap-2">
      {reactions.map(r => (
        <ReactionButton key={r.type} reaction={r} onToggle={onToggle} />
      ))}
    </div>
  );
}
```

**Pattern:** Receives data via props. Calls callbacks for actions. Testable in isolation.

## 3. Shared Components

Location: `shared/components/`

Generic, reusable UI. No business logic. Used by 2+ modules.

```tsx
// shared/components/Button.tsx
export function Button({ variant, size, children, ...props }: ButtonProps) {
  return (
    <button className={getButtonStyles(variant, size)} {...props}>
      {children}
    </button>
  );
}
```

**Pattern:** Pure presentation. Configurable via props. No knowledge of domain.
```

**Step 8: Create architecture/ssr-strategy.mdx**

Create `docs-site/pages/architecture/ssr-strategy.mdx`:

```mdx
# SSR Strategy

Next.js offers three rendering modes. The architecture makes the choice visible and intentional.

## Rendering Modes

| Mode | When Code Runs | Use When |
|------|----------------|----------|
| **SSR** (`getServerSideProps`) | Server, every request | Auth-protected pages, real-time data |
| **SSG** (`getStaticProps`) | Server, build time | Public content that rarely changes |
| **CSR** (client-side) | Browser only | Interactive features, user-specific UI |

## Pattern: Thin Page Files

Page files handle routing and SSR decisions only. All composition happens in modules.

### Before (mixed concerns)

```tsx
// pages/stories/[slug].tsx - 197 lines, does 5 things
export default function StoryPage({ story, error }) {
  // Error handling, SEO, layout, content, engagement...
}

export const getServerSideProps = async (ctx) => {
  // Fetch logic, error handling, data processing...
}
```

### After (single responsibility)

```tsx
// pages/stories/[slug].tsx - ~20 lines
import { getStorySSR } from '@/rendering/server/stories';
import { StoryPage } from '@/modules/stories';

export const getServerSideProps = getStorySSR;

export default function Page(props) {
  return <StoryPage {...props} />;
}
```

## SSR Helpers

The `rendering/server/` folder contains reusable SSR patterns:

```tsx
// rendering/server/stories.ts
export const getStorySSR: GetServerSideProps = async (ctx) => {
  const { slug } = ctx.params || {};

  if (!slug || typeof slug !== 'string') {
    return { props: createErrorProps('Story not found') };
  }

  try {
    const story = await fetchStoryBySlug(slug);
    const { ogImage, excerpt } = await processStoryData(story);
    return { props: { story, ogImage, excerpt } };
  } catch (error) {
    return { props: createErrorProps(error.message) };
  }
};
```

This pattern makes SSR logic:
- **Testable** - Pure function, no React needed
- **Reusable** - Same pattern across pages
- **Explicit** - Clear what runs on server vs client
```

**Step 9: Create architecture/testing.mdx**

Create `docs-site/pages/architecture/testing.mdx`:

```mdx
# Testing Strategy

The module structure enables testing by separating concerns.

## Testing Pyramid

```
         ╱╲
        ╱  ╲         E2E Tests (Playwright)
       ╱ 5% ╲        Full user flows, critical paths only
      ╱──────╲
     ╱        ╲      Integration Tests
    ╱   15%    ╲     Module pages with mocked APIs
   ╱────────────╲
  ╱              ╲   Unit Tests
 ╱      80%       ╲  Hooks, utils, components in isolation
╱──────────────────╲
```

## What Gets Tested Where

| Layer | What to Test | How |
|-------|--------------|-----|
| `utils/` | Pure functions | Unit tests - input/output |
| `hooks/` | State logic, API calls | Unit tests with mocked fetch |
| `components/` | Rendering, interactions | Component tests (Testing Library) |
| `modules/*/pages/` | Composition, error states | Integration tests |
| `rendering/server/` | SSR logic | Unit tests (no browser needed) |
| Full flows | Critical user journeys | E2E (Playwright) |

## Test File Convention

Tests live next to the code they test:

```
modules/stories/
├── components/
│   ├── StoryCard.tsx
│   └── StoryCard.test.tsx
├── hooks/
│   ├── useFetchStory.ts
│   └── useFetchStory.test.ts
└── pages/
    ├── StoryPage.tsx
    └── StoryPage.test.tsx
```

## Why This Structure Enables Testing

1. **SSR logic is extractable** - `rendering/server/` can be unit tested without Next.js
2. **Hooks are isolated** - Test data fetching without rendering components
3. **Components receive props** - No internal fetching = easy to test with mock data
4. **Modules have boundaries** - Test a module in isolation by mocking dependencies
```

**Step 10: Create architecture/future-direction.mdx**

Create `docs-site/pages/architecture/future-direction.mdx`:

```mdx
# Future Direction: field-notes Monorepo

This architecture is designed to eventually live inside a larger monorepo.

## Target Structure

```
field-notes/                        # Monorepo root
├── apps/
│   ├── ghostmonk/                  # This app (renamed from turbulence)
│   │   ├── frontend/
│   │   └── backend/
│   │
│   ├── atomicballoon/              # Future app
│   │   ├── frontend/
│   │   └── backend/
│   │
│   └── docs/                       # Documentation site
│
├── packages/                       # Shared across apps
│   ├── ui/                         # Shared component library
│   ├── core/                       # Shared business logic
│   ├── config/                     # Shared configs
│   └── types/                      # Shared type definitions
│
└── package.json                    # Turborepo workspace
```

## Why This Matters Now

The current refactor keeps module boundaries clean so extraction is straightforward:

1. **Modules are self-contained** - Each module can become a package
2. **Shared code is isolated** - `shared/` maps to `packages/`
3. **Clear public APIs** - Each module exports through `index.ts`

## When to Extract

Extract to `packages/` when:
- Code is used by both ghostmonk and atomicballoon
- The abstraction is stable and well-tested
- Benefits outweigh the coordination overhead

Keep in app when:
- Only one app uses it
- Still evolving rapidly
- App-specific customization needed
```

**Step 11: Create adr/_meta.json**

Create `docs-site/pages/adr/_meta.json`:

```json
{
  "index": "Overview"
}
```

**Step 12: Create adr/index.mdx**

Create `docs-site/pages/adr/index.mdx`:

```mdx
# Architecture Decision Records

This section contains Architecture Decision Records (ADRs) documenting significant technical decisions.

## What is an ADR?

An ADR captures:
- **Context** - What situation prompted this decision?
- **Decision** - What did we decide?
- **Consequences** - What are the trade-offs?

## ADR Index

*ADRs will be migrated here from `docs/adr/` in future phases.*
```

**Step 13: Create guides/_meta.json**

Create `docs-site/pages/guides/_meta.json`:

```json
{
  "index": "Overview"
}
```

**Step 14: Create guides/index.mdx**

Create `docs-site/pages/guides/index.mdx`:

```mdx
# Development Guides

Practical guides for working in this codebase.

## Available Guides

*Guides will be added as the refactor progresses:*

- Adding a Module (coming in Phase 4+)
- Creating Components (coming in Phase 4+)
- SSR Patterns (coming in Phase 7)
```

**Step 15: Commit**

```bash
git add docs-site/pages/
git commit -m "feat(docs): add architecture documentation pages"
```

---

## Task 3: Verify Local Build

**Files:** None (verification only)

**Step 1: Install dependencies**

```bash
cd docs-site && npm install
```

Expected: Dependencies install successfully.

**Step 2: Run development server**

```bash
npm run dev
```

Expected: Server starts at http://localhost:3000. Navigate to verify pages render.

**Step 3: Build static export**

```bash
npm run build
```

Expected: Build succeeds, `out/` directory created with static HTML.

**Step 4: Verify basePath**

Check that `out/` contains files at `/turbulence/` path:

```bash
ls out/turbulence/
```

Expected: `index.html`, `architecture/`, etc.

**Step 5: Commit any fixes**

If any fixes were needed:

```bash
git add -A
git commit -m "fix(docs): resolve build issues"
```

---

## Task 4: Add GitHub Pages Workflow

**Files:**
- Create: `.github/workflows/docs.yml`

**Step 1: Create workflow file**

Create `.github/workflows/docs.yml`:

```yaml
name: Deploy Docs to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'docs-site/**'
      - 'docs/**'
      - '.github/workflows/docs.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: docs-site/package-lock.json

      - name: Install dependencies
        working-directory: docs-site
        run: npm ci

      - name: Build
        working-directory: docs-site
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs-site/out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Commit**

```bash
git add .github/workflows/docs.yml
git commit -m "ci: add GitHub Pages deployment workflow for docs"
```

---

## Task 5: Update Repository Settings Documentation

**Files:**
- Create: `docs-site/SETUP.md`

**Step 1: Create setup instructions**

Create `docs-site/SETUP.md`:

```markdown
# Documentation Site Setup

## GitHub Pages Configuration

After merging to main, enable GitHub Pages:

1. Go to repository Settings → Pages
2. Under "Build and deployment":
   - Source: GitHub Actions
3. The workflow will auto-deploy on push to main

## Local Development

```bash
cd docs-site
npm install
npm run dev
```

Visit http://localhost:3000/turbulence

## Building

```bash
npm run build
```

Output is in `out/` directory.

## URL

Once deployed: `https://yourusername.github.io/turbulence`
```

**Step 2: Commit**

```bash
git add docs-site/SETUP.md
git commit -m "docs: add documentation site setup instructions"
```

---

## Task 6: Generate package-lock.json

**Files:**
- Create: `docs-site/package-lock.json`

**Step 1: Generate lock file**

```bash
cd docs-site && npm install
```

**Step 2: Commit lock file**

```bash
git add docs-site/package-lock.json
git commit -m "chore(docs): add package-lock.json for CI"
```

---

## Task 7: Final Verification and PR

**Step 1: Run full build**

```bash
cd docs-site && npm run build
```

Expected: Build succeeds.

**Step 2: Verify all commits**

```bash
git log --oneline -10
```

Expected: See all Phase 1 commits.

**Step 3: Push branch**

```bash
git push -u origin ghostmonk/documentation-infrastructure
```

**Step 4: Create PR**

```bash
gh pr create --title "Phase 1: Documentation Infrastructure" --body "$(cat <<'EOF'
## Summary

Sets up Nextra documentation site with GitHub Pages deployment.

- Initializes Nextra project in `docs-site/`
- Adds architecture documentation (overview, folder structure, component patterns, SSR, testing, future direction)
- Adds GitHub Actions workflow for automatic deployment
- Docs will be available at `yourusername.github.io/turbulence`

## Phase 1 of Frontend Architecture Refactor

See `docs/plans/2026-01-03-frontend-architecture-refactor.md` for full plan.

## Test Plan

- [ ] `cd docs-site && npm install && npm run build` succeeds
- [ ] Local dev server renders all pages
- [ ] After merge, GitHub Pages deploys successfully

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Completion Checklist

- [ ] Task 1: Nextra project initialized
- [ ] Task 2: Documentation pages created
- [ ] Task 3: Local build verified
- [ ] Task 4: GitHub Pages workflow added
- [ ] Task 5: Setup documentation added
- [ ] Task 6: package-lock.json committed
- [ ] Task 7: PR created and ready for review
