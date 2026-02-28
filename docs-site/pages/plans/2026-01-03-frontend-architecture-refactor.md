# Frontend Architecture Refactor

**Date:** 2026-01-03
**Status:** Proposed
**Author:** ghostmonk + Claude

## Overview

A refactor of the frontend to establish clear architectural patterns, improve testability, and create living documentation. This work prepares the codebase for dynamic routing and future extraction into the `field-notes` monorepo.

## Goals

1. **Clarity** - Every file has one purpose, every folder has clear intent
2. **Testability** - Logic separated from presentation, easily unit tested
3. **Standardization** - One way to do things, documented
4. **Extensibility** - New features follow established patterns
5. **Teachability** - Patterns transfer to future projects (atomicballoon.com)

## Guiding Principles

### Patterns Over Frameworks

Every architectural decision is explained in terms of the underlying pattern first, then how React/Next.js expresses it. "Separation of concerns" is the pattern; "custom hooks for logic, components for UI" is the React expression.

### Explicit Over Implicit

React has many "magic" conventions (file-based routing, automatic code splitting, hydration). The documentation makes these explicit - what happens, when, and why it matters.

### One Way to Do Things

React offers many paths to the same outcome. This architecture documents ONE chosen pattern for each concern, with reasoning. No guessing.

### Teachable and Transferable

Each pattern documented here should be applicable to other projects with minimal translation. The docs serve as a template, not just a reference.

### Visual Where Possible

Folder structures, data flow, component hierarchies - diagrams where they clarify.

---

## Folder Structure

```
frontend/src/
│
├── pages/                              # ROUTING LAYER (thin)
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx                       # composes from modules/home
│   ├── editor.tsx                      # composes from modules/editor
│   ├── about.tsx                       # composes from modules/static
│   ├── contact.tsx
│   ├── privacy.tsx
│   ├── terms.tsx
│   ├── projects.tsx
│   ├── api/                            # API routes stay here
│   │   └── ...
│   ├── stories/
│   │   └── [slug].tsx                  # ~20 lines: SSR + compose
│   └── projects/
│       └── [id].tsx
│
├── modules/                            # FEATURE MODULES
│   ├── stories/
│   │   ├── components/
│   │   │   ├── StoryCard.tsx
│   │   │   ├── StoryContent.tsx
│   │   │   ├── StoryEngagement.tsx
│   │   │   ├── StoryLayout.tsx
│   │   │   ├── StoryList.tsx
│   │   │   ├── StoryMeta.tsx           # SEO/head tags
│   │   │   └── index.ts                # exports all components
│   │   ├── hooks/
│   │   │   ├── useFetchStory.ts
│   │   │   ├── useFetchStories.ts
│   │   │   ├── useStoryMutations.ts
│   │   │   └── index.ts
│   │   ├── pages/
│   │   │   ├── StoryPage.tsx           # Composes story view
│   │   │   ├── StoriesPage.tsx         # Composes story list
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── story.ts
│   │   └── index.ts                    # Module public API
│   │
│   ├── editor/
│   │   ├── components/
│   │   │   ├── RichTextEditor.tsx
│   │   │   ├── EditorToolbar.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useStoryEditor.ts
│   │   │   └── index.ts
│   │   ├── pages/
│   │   │   └── EditorPage.tsx
│   │   └── index.ts
│   │
│   ├── engagement/
│   │   ├── components/
│   │   │   ├── ReactionBar.tsx
│   │   │   ├── CommentSection.tsx
│   │   │   ├── CommentThread.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   └── useEngagement.ts
│   │   ├── providers/
│   │   │   └── EngagementProvider.tsx
│   │   └── index.ts
│   │
│   └── static/                         # About, Contact, Terms, Privacy
│       ├── pages/
│       │   ├── AboutPage.tsx
│       │   ├── ContactPage.tsx
│       │   └── index.ts
│       └── index.ts
│
├── shared/                             # CROSS-MODULE CODE
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── ErrorDisplay.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Modal.tsx
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useMediaQuery.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── api-client.ts
│   │   └── logging/
│   ├── types/
│   │   └── api.ts
│   └── utils/
│       ├── formatDate.ts
│       ├── urls.ts
│       └── index.ts
│
├── rendering/                          # SSR PATTERNS
│   ├── server/
│   │   ├── stories.ts                  # getStorySSR, getStoriesSSR
│   │   ├── auth.ts                     # withAuth wrapper
│   │   ├── helpers.ts                  # createErrorProps, etc.
│   │   └── index.ts
│   └── client/
│       └── lazy.ts                     # Client-side lazy loading patterns
│
└── layout/                             # APP SHELL
    ├── Layout.tsx
    ├── TopNav.tsx
    ├── Footer.tsx
    ├── BottomNav.tsx
    └── index.ts
```

### Layer Responsibilities

| Layer | Purpose | Data Flow |
|-------|---------|-----------|
| `pages/` | Routing, SSR decisions | Receives SSR data, passes to modules |
| `modules/` | Feature implementation | Composes shared components, uses hooks |
| `shared/` | Reusable code | Imported by modules |
| `rendering/` | SSR/CSR patterns | Used by pages |
| `layout/` | App shell | Wraps all pages |

**Data flows DOWN through layers.** Pages compose modules. Modules compose shared. Never upward.

---

## SSR Strategy

Next.js offers three rendering modes. The architecture makes the choice visible:

| Mode | When Code Runs | Use When |
|------|----------------|----------|
| **SSR** (`getServerSideProps`) | Server, every request | Auth-protected pages, real-time data |
| **SSG** (`getStaticProps`) | Server, build time | Public content that rarely changes |
| **CSR** (client-side) | Browser only | Interactive features, user-specific UI |

### Pattern: Thin Page Files

Page files handle routing and SSR decisions only. All composition happens in modules.

**Before (197 lines, mixed concerns):**
```typescript
// pages/stories/[slug].tsx - does 5 things
export default function StoryPage({ story, error }) {
  // Error handling, SEO, layout, content, engagement...
}

export const getServerSideProps = async (ctx) => {
  // Fetch logic, error handling, data processing...
}
```

**After (~20 lines, single responsibility):**
```typescript
// pages/stories/[slug].tsx
import { getStorySSR } from '@/rendering/server/stories';
import { StoryPage } from '@/modules/stories';

export const getServerSideProps = getStorySSR;

export default function Page(props) {
  return <StoryPage {...props} />;
}
```

SSR logic moves to `rendering/server/`, composition moves to `modules/*/pages/`.

---

## Component Patterns

Three types of components, each with a clear role:

### 1. Page Components (`modules/*/pages/`)

Compose features into a complete view. No direct data fetching - receive data via props from SSR or use hooks.

```typescript
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

### 2. Feature Components (`modules/*/components/`)

Implement specific functionality. May use hooks for logic. Scoped to their module.

```typescript
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

### 3. Shared Components (`shared/components/`)

Generic, reusable UI. No business logic. Used by 2+ modules.

```typescript
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

### Decision Guide

| Question | Answer | Location |
|----------|--------|----------|
| Used by 2+ modules? | Yes | `shared/components/` |
| Composes a full view? | Yes | `modules/*/pages/` |
| Feature-specific? | Yes | `modules/*/components/` |

---

## Testing Strategy

The module structure enables testing by separating concerns:

### Testing Pyramid

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
╱__________________╲
```

### What Gets Tested Where

| Layer | What to Test | How |
|-------|--------------|-----|
| `utils/` | Pure functions | Unit tests - input/output |
| `hooks/` | State logic, API calls | Unit tests with mocked fetch |
| `components/` | Rendering, interactions | Component tests (Testing Library) |
| `modules/*/pages/` | Composition, error states | Integration tests |
| `rendering/server/` | SSR logic | Unit tests (no browser needed) |
| Full flows | Critical user journeys | E2E (Playwright) |

### Test File Convention

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

---

## Documentation Site

### Structure

```
docs-site/                          # Nextra-based Next.js app
├── pages/
│   ├── _meta.json                  # Navigation structure
│   ├── index.mdx                   # Home page
│   ├── architecture/
│   │   ├── _meta.json
│   │   ├── overview.mdx
│   │   ├── folder-structure.mdx
│   │   ├── component-patterns.mdx
│   │   ├── ssr-strategy.mdx
│   │   ├── testing.mdx
│   │   └── future-direction.mdx    # Monorepo vision
│   ├── adr/
│   │   ├── _meta.json
│   │   └── ...                     # Existing ADRs
│   └── guides/
│       ├── _meta.json
│       ├── adding-a-module.mdx
│       ├── creating-components.mdx
│       └── ssr-patterns.mdx
├── theme.config.tsx
├── next.config.js
└── package.json
```

### Deployment

- **Platform:** GitHub Pages
- **URL:** `yourusername.github.io/turbulence` (subdomain later)
- **Trigger:** Push to main, changes in `docs-site/` or `docs/`
- **Cost:** Free

---

## Future Direction: field-notes Monorepo

This architecture is designed to eventually live inside a larger monorepo:

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

The current refactor keeps module boundaries clean so extraction is straightforward when the time comes.

---

## Implementation Phases

Each phase is a separate PR, passes all tests, and can be deployed independently.

### Phase 1: Documentation Infrastructure

- Add `docs-site/` with Nextra
- Add GitHub Pages workflow
- Write initial architecture docs
- **Deploy:** Docs site goes live, app unchanged

### Phase 2: Shared Extraction

- Create `shared/` folder
- Move `utils/` → `shared/utils/`
- Move `lib/` → `shared/lib/`
- Move `types/` → `shared/types/`
- Update all imports
- **Deploy:** Same app, reorganized internals

### Phase 3: Layout Extraction

- Create `layout/` folder
- Move Layout, TopNav, Footer, BottomNav from `components/`
- Update imports
- **Deploy:** Same app, layout separated

### Phase 4: Stories Module

- Create `modules/stories/`
- Move story-related components, hooks
- Create `modules/stories/pages/StoryPage.tsx`
- Thin out `pages/stories/[slug].tsx`
- **Deploy:** Same behavior, modularized

### Phase 5: Engagement Module

- Create `modules/engagement/`
- Move engagement components
- Update imports from stories module
- **Deploy:** Same behavior, engagement isolated

### Phase 6: Editor Module

- Create `modules/editor/`
- Move RichTextEditor, editor hooks
- Thin out `pages/editor.tsx`
- **Deploy:** Same behavior, editor isolated

### Phase 7: Rendering Patterns

- Create `rendering/server/`
- Extract SSR helpers from page files
- Refactor pages to use shared SSR patterns
- **Deploy:** Same behavior, SSR centralized

### Phase 8: Static Pages Module

- Create `modules/static/`
- Extract About, Contact, Terms, Privacy
- Thin out corresponding page files
- **Deploy:** Same behavior, static pages organized

### Phase 9: Documentation Completion

- Write all architecture guides
- Add "Creating a Module" guide
- Review, polish, publish final docs
- **Deploy:** Complete documentation

---

## Success Criteria

- [ ] All tests pass after each phase
- [ ] No user-facing behavior changes (until complete)
- [ ] Each file has single responsibility
- [ ] New developer can understand structure in <30 minutes
- [ ] Documentation site live and accurate
- [ ] Clear path to field-notes monorepo extraction
