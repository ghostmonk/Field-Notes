# Display Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract display components into a registry pattern enabling dynamic section rendering in Phase 4.

**Architecture:** Create `modules/registry/` with content and display registries. Extract existing inline rendering into reusable components. Keep displays pure (props-based) with pages handling data fetching. This is purely internal refactoring - no URL changes, no new functionality.

**Tech Stack:** React, TypeScript, Next.js

---

## Task 1: Create Projects Module

Create the projects module structure with extracted `ProjectCard` component.

**Files:**
- Create: `frontend/src/modules/projects/index.ts`
- Create: `frontend/src/modules/projects/components/index.ts`
- Create: `frontend/src/modules/projects/components/ProjectCard.tsx`

**Step 1: Create ProjectCard component**

Extract the project card rendering from `pages/projects.tsx` lines 55-107 into a standalone component.

Create `frontend/src/modules/projects/components/ProjectCard.tsx`:

```tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ProjectCard as ProjectCardType } from '@/shared/types/api';

interface ProjectCardProps {
    project: ProjectCardType;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
    return (
        <Link
            href={`/projects/${project.slug}`}
            className="card card--hoverable card--link"
        >
            {project.image_url && (
                <Image
                    src={project.image_url}
                    alt={project.title}
                    width={400}
                    height={160}
                    className="project-image"
                />
            )}

            <h3 className="section-title mb-sm">
                {project.title}
                {project.is_featured && (
                    <span className="badge--featured">
                        Featured
                    </span>
                )}
            </h3>

            <p className="text-text-secondary mb-lg">
                {project.summary}
            </p>

            {project.technologies.length > 0 && (
                <div className="tech-tags">
                    {project.technologies.map((tech) => (
                        <span key={tech} className="tech-tag">
                            {tech}
                        </span>
                    ))}
                </div>
            )}

            <div className="project-links">
                {project.github_url && (
                    <span className="text-text-secondary text-sm">
                        GitHub
                    </span>
                )}
                {project.live_url && (
                    <span className="text-text-secondary text-sm">
                        Live Demo
                    </span>
                )}
            </div>
        </Link>
    );
};
```

**Step 2: Create component barrel export**

Create `frontend/src/modules/projects/components/index.ts`:

```ts
export { ProjectCard } from './ProjectCard';
```

**Step 3: Create module barrel export**

Create `frontend/src/modules/projects/index.ts`:

```ts
// Components
export * from './components';
```

**Step 4: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/modules/projects/
git commit -m "feat(registry): add projects module with ProjectCard component"
```

---

## Task 2: Update projects.tsx to Use ProjectCard

Update the projects page to import and use the new `ProjectCard` component.

**Files:**
- Modify: `frontend/src/pages/projects.tsx`

**Step 1: Update imports**

In `frontend/src/pages/projects.tsx`, replace the Image and Link imports used for cards:

```tsx
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import apiClient from '@/shared/lib/api-client';
import { ProjectCard as ProjectCardType } from '@/shared/types/api';
import { ProjectCard } from '@/modules/projects';
```

**Step 2: Replace inline card rendering**

Replace lines 55-107 (the inline card rendering) with:

```tsx
{!loading && !error && projects.length > 0 && (
    <div className="grid grid--responsive">
        {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
        ))}
    </div>
)}
```

**Step 3: Run e2e tests to verify no regression**

Run: `cd frontend && npm run test:e2e -- --grep "projects"`
Expected: All projects tests pass

**Step 4: Commit**

```bash
git add frontend/src/pages/projects.tsx
git commit -m "refactor(projects): use ProjectCard component from projects module"
```

---

## Task 3: Extract StoryCard Component

Extract the inline `StoryItem` component from `StoryList.tsx` into a standalone `StoryCard` component.

**Files:**
- Create: `frontend/src/modules/stories/components/StoryCard.tsx`
- Modify: `frontend/src/modules/stories/components/index.ts`

**Step 1: Create StoryCard component**

Extract lines 48-166 from `StoryList.tsx` into `frontend/src/modules/stories/components/StoryCard.tsx`:

```tsx
import React from 'react';
import Link from 'next/link';
import type { Session } from 'next-auth';
import { formatDate } from '@/shared/utils/formatDate';
import { Story } from '@/shared/types/api';
import { LazyStoryContent } from './LazyStoryContent';

const REACTION_ICONS: Record<string, string> = {
    thumbup: '👍',
    heart: '❤️',
    surprise: '😮',
    celebrate: '🎉',
    insightful: '💡',
};

/**
 * Safely gets the story URL based on the slug
 * Falls back to ID if slug is not available
 */
const getStoryPath = (story: Story): string => {
    if (!story.slug || story.slug.trim() === '') {
        return `/stories/${story.id}`;
    }
    return `/stories/${story.slug}`;
};

const canEditStory = (session: Session | null, story: Story): boolean => {
    if (!session?.user) return false;
    if (session.user.role === 'admin') return true;
    if (story.user_id && session.user.id === story.user_id) return true;
    return false;
};

export interface EngagementCounts {
    reactions: Record<string, number>;
    comment_count: number;
}

export interface StoryCardProps {
    story: Story;
    session: Session | null;
    onEdit: (story: Story) => void;
    onDelete: (story: Story) => Promise<void>;
    deleteLoading: boolean;
    engagementCounts?: EngagementCounts;
}

export const StoryCard = React.memo(({
    story,
    session,
    onEdit,
    onDelete,
    deleteLoading,
    engagementCounts
}: StoryCardProps) => {
    const isDraft = !story.is_published;
    const storyPath = getStoryPath(story);
    const canEdit = canEditStory(session, story);

    return (
        <div
            key={story.id}
            className={`card ${isDraft ? 'card--draft' : ''}`}
            data-testid={`story-card-${story.id}`}
        >
            <div className="story-header">
                <div className="story-header__actions">
                    {isDraft && (
                        <span className="badge badge--draft" data-testid={`story-draft-badge-${story.id}`}>
                            DRAFT
                        </span>
                    )}
                    {canEdit && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onEdit(story)}
                                className="btn btn--primary btn--sm"
                                data-testid={`story-edit-${story.id}`}
                            >
                                Edit
                            </button>
                            {isDraft && (
                                <button
                                    onClick={() => onDelete(story)}
                                    disabled={deleteLoading}
                                    className="btn btn--danger btn--sm"
                                    data-testid={`story-delete-${story.id}`}
                                >
                                    {deleteLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <Link
                    href={storyPath}
                    className={`${isDraft ? 'pointer-events-none' : ''}`}
                    data-testid={`story-title-link-${story.id}`}
                >
                    <h2
                        className={`story-title ${!isDraft ? 'story-title--link' : 'story-title--draft'}`}
                        title={story.title}
                        data-testid={`story-title-${story.id}`}
                    >
                        {story.title}
                    </h2>
                </Link>

                <div className="story-header__meta">
                    <span>{formatDate(story.createdDate)}</span>
                    {story.updatedDate !== story.createdDate && (
                        <span className="opacity-70">
                            (Updated: {formatDate(story.updatedDate)})
                        </span>
                    )}
                </div>
            </div>

            {!isDraft && (
                <>
                    <Link href={storyPath} className="block" data-testid={`story-content-link-${story.id}`}>
                        <LazyStoryContent
                            content={story.content}
                            className="story-content prose--card"
                        />
                        <div className="mt-4">
                            <span className="btn btn--secondary btn--sm" data-testid={`story-read-more-${story.id}`}>
                                Read full story →
                            </span>
                        </div>
                    </Link>
                    {engagementCounts && (
                        <div className="mt-4 flex items-center justify-end gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {Object.entries(engagementCounts.reactions).length > 0 && (
                                <span className="flex items-center gap-3">
                                    {Object.entries(engagementCounts.reactions).map(([tag, count]) => (
                                        <span key={tag} className="flex items-center gap-1">
                                            {REACTION_ICONS[tag]} {count}
                                        </span>
                                    ))}
                                </span>
                            )}
                            {engagementCounts.comment_count > 0 && (
                                <span>💬 {engagementCounts.comment_count}</span>
                            )}
                        </div>
                    )}
                </>
            )}
            {isDraft && (
                <LazyStoryContent
                    content={story.content}
                    className="story-content prose--card"
                />
            )}
        </div>
    );
});

StoryCard.displayName = 'StoryCard';
```

**Step 2: Update stories component index**

Modify `frontend/src/modules/stories/components/index.ts`:

```ts
export { default as StoryList } from './StoryList';
export { LazyStoryContent } from './LazyStoryContent';
export { StoryCard } from './StoryCard';
export type { StoryCardProps, EngagementCounts } from './StoryCard';
```

**Step 3: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/modules/stories/components/
git commit -m "feat(stories): extract StoryCard component"
```

---

## Task 4: Update StoryList to Use StoryCard

Update `StoryList.tsx` to import and use the extracted `StoryCard` component.

**Files:**
- Modify: `frontend/src/modules/stories/components/StoryList.tsx`

**Step 1: Update imports**

At the top of `StoryList.tsx`, add import for StoryCard:

```tsx
import { StoryCard } from './StoryCard';
import type { EngagementCounts } from './StoryCard';
```

**Step 2: Remove the inline StoryItem component and helper functions**

Delete:
- Lines 15-21 (REACTION_ICONS constant) - moved to StoryCard
- Lines 23-32 (getStoryPath function) - moved to StoryCard
- Lines 34-41 (canEditStory function) - moved to StoryCard
- Lines 43-47 (EngagementCounts interface) - moved to StoryCard
- Lines 48-168 (StoryItem component) - replaced by StoryCard

**Step 3: Update storyItems mapping**

In the `Stories` component, update the `storyItems` useMemo to use `StoryCard`:

```tsx
const storyItems = useMemo(() => {
    return stories.map(story => (
        <StoryCard
            key={story.id}
            story={story}
            session={session}
            onEdit={handleEdit}
            onDelete={handleDelete}
            deleteLoading={deleteLoading}
            engagementCounts={engagementCounts[`story:${story.id}`]}
        />
    ));
}, [stories, session, handleEdit, handleDelete, deleteLoading, engagementCounts]);
```

**Step 4: Run e2e tests to verify no regression**

Run: `cd frontend && npm run test:e2e -- --grep "stories"`
Expected: All story tests pass

**Step 5: Commit**

```bash
git add frontend/src/modules/stories/components/StoryList.tsx
git commit -m "refactor(stories): use StoryCard component in StoryList"
```

---

## Task 5: Create Registry Module Structure

Create the registry module with types and basic structure.

**Files:**
- Create: `frontend/src/modules/registry/index.ts`
- Create: `frontend/src/modules/registry/types.ts`

**Step 1: Create types file**

Create `frontend/src/modules/registry/types.ts`:

```ts
import { ComponentType } from 'react';

/**
 * Display types determine HOW content is rendered (layout)
 */
export type DisplayType = 'feed' | 'card-grid' | 'static-page';

/**
 * Content types determine WHAT is being rendered
 */
export type ContentType = 'story' | 'project' | 'page';

/**
 * Content registry entry - maps a content type to its list and detail components
 */
export interface ContentEntry<T = unknown> {
    /** Component for rendering item in a list (null if not listable) */
    listItem: ComponentType<{ item: T }> | null;
    /** Component for rendering item detail (null if no detail view) */
    detail: ComponentType<{ item: T }> | null;
}

/**
 * Props for FeedDisplay - infinite scroll list
 */
export interface FeedDisplayProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading?: boolean;
}

/**
 * Props for CardGridDisplay - responsive grid
 */
export interface CardGridDisplayProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
}

/**
 * Props for StaticPageDisplay - single content block
 */
export interface StaticPageDisplayProps {
    content: string;
    title?: string;
}
```

**Step 2: Create module index**

Create `frontend/src/modules/registry/index.ts`:

```ts
// Types
export type {
    DisplayType,
    ContentType,
    ContentEntry,
    FeedDisplayProps,
    CardGridDisplayProps,
    StaticPageDisplayProps,
} from './types';
```

**Step 3: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/modules/registry/
git commit -m "feat(registry): add registry module with types"
```

---

## Task 6: Create FeedDisplay Component

Create the FeedDisplay component for infinite scroll lists.

**Files:**
- Create: `frontend/src/modules/registry/displays/FeedDisplay.tsx`
- Create: `frontend/src/modules/registry/displays/index.ts`

**Step 1: Create FeedDisplay component**

Create `frontend/src/modules/registry/displays/FeedDisplay.tsx`:

```tsx
import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import ClipLoader from 'react-spinners/ClipLoader';
import { FeedDisplayProps } from '../types';

export function FeedDisplay<T extends { id: string }>({
    items,
    renderItem,
    onLoadMore,
    hasMore,
    isLoading = false,
}: FeedDisplayProps<T>) {
    if (items.length === 0 && isLoading) {
        return (
            <div className="flex justify-center items-center py-8">
                <ClipLoader color="var(--color-brand-primary)" loading={true} size={35} />
            </div>
        );
    }

    return (
        <div className="mt-4" data-testid="feed-display">
            <InfiniteScroll
                dataLength={items.length}
                next={onLoadMore}
                hasMore={hasMore}
                loader={
                    <div className="flex justify-center items-center py-4">
                        <ClipLoader color="var(--color-brand-primary)" loading={true} size={35} />
                    </div>
                }
                endMessage={
                    items.length > 0 ? (
                        <div className="text-center py-4 text-text-secondary" data-testid="feed-end">
                            You&apos;ve reached the end
                        </div>
                    ) : null
                }
            >
                <div className="flex flex-col space-y-6">
                    {items.map(item => (
                        <React.Fragment key={item.id}>
                            {renderItem(item)}
                        </React.Fragment>
                    ))}
                </div>
            </InfiniteScroll>
        </div>
    );
}
```

**Step 2: Create displays barrel export**

Create `frontend/src/modules/registry/displays/index.ts`:

```ts
export { FeedDisplay } from './FeedDisplay';
```

**Step 3: Update registry index to export displays**

Modify `frontend/src/modules/registry/index.ts`:

```ts
// Types
export type {
    DisplayType,
    ContentType,
    ContentEntry,
    FeedDisplayProps,
    CardGridDisplayProps,
    StaticPageDisplayProps,
} from './types';

// Displays
export { FeedDisplay } from './displays';
```

**Step 4: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/modules/registry/
git commit -m "feat(registry): add FeedDisplay component"
```

---

## Task 7: Create CardGridDisplay Component

Create the CardGridDisplay component for responsive grids.

**Files:**
- Create: `frontend/src/modules/registry/displays/CardGridDisplay.tsx`
- Modify: `frontend/src/modules/registry/displays/index.ts`

**Step 1: Create CardGridDisplay component**

Create `frontend/src/modules/registry/displays/CardGridDisplay.tsx`:

```tsx
import React from 'react';
import { CardGridDisplayProps } from '../types';

export function CardGridDisplay<T extends { id: string }>({
    items,
    renderItem,
}: CardGridDisplayProps<T>) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="grid grid--responsive" data-testid="card-grid-display">
            {items.map(item => (
                <React.Fragment key={item.id}>
                    {renderItem(item)}
                </React.Fragment>
            ))}
        </div>
    );
}
```

**Step 2: Update displays barrel export**

Modify `frontend/src/modules/registry/displays/index.ts`:

```ts
export { FeedDisplay } from './FeedDisplay';
export { CardGridDisplay } from './CardGridDisplay';
```

**Step 3: Update registry index**

Modify `frontend/src/modules/registry/index.ts`:

```ts
// Types
export type {
    DisplayType,
    ContentType,
    ContentEntry,
    FeedDisplayProps,
    CardGridDisplayProps,
    StaticPageDisplayProps,
} from './types';

// Displays
export { FeedDisplay, CardGridDisplay } from './displays';
```

**Step 4: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/modules/registry/
git commit -m "feat(registry): add CardGridDisplay component"
```

---

## Task 8: Create StaticPageDisplay Component

Create the StaticPageDisplay component for static content pages.

**Files:**
- Create: `frontend/src/modules/registry/displays/StaticPageDisplay.tsx`
- Modify: `frontend/src/modules/registry/displays/index.ts`

**Step 1: Create StaticPageDisplay component**

Create `frontend/src/modules/registry/displays/StaticPageDisplay.tsx`:

```tsx
import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { StaticPageDisplayProps } from '../types';

export const StaticPageDisplay: React.FC<StaticPageDisplayProps> = ({
    content,
    title,
}) => {
    return (
        <div className="card" data-testid="static-page-display">
            {title && (
                <h1 className="page-title mb-lg">{title}</h1>
            )}
            <div className="prose prose--card">
                {/* Admin-controlled CMS content - DOMPurify sanitization is appropriate */}
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
            </div>
        </div>
    );
};
```

**Step 2: Update displays barrel export**

Modify `frontend/src/modules/registry/displays/index.ts`:

```ts
export { FeedDisplay } from './FeedDisplay';
export { CardGridDisplay } from './CardGridDisplay';
export { StaticPageDisplay } from './StaticPageDisplay';
```

**Step 3: Update registry index**

Modify `frontend/src/modules/registry/index.ts`:

```ts
// Types
export type {
    DisplayType,
    ContentType,
    ContentEntry,
    FeedDisplayProps,
    CardGridDisplayProps,
    StaticPageDisplayProps,
} from './types';

// Displays
export { FeedDisplay, CardGridDisplay, StaticPageDisplay } from './displays';
```

**Step 4: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/modules/registry/
git commit -m "feat(registry): add StaticPageDisplay component"
```

---

## Task 9: Create Content Registry

Create the content registry mapping content types to their components.

**Files:**
- Create: `frontend/src/modules/registry/contentRegistry.ts`
- Modify: `frontend/src/modules/registry/index.ts`

**Step 1: Create content registry**

Create `frontend/src/modules/registry/contentRegistry.ts`:

```ts
import { StoryCard } from '@/modules/stories';
import { ProjectCard } from '@/modules/projects';
import { ContentType, ContentEntry } from './types';
import { Story, ProjectCard as ProjectCardType, Page } from '@/shared/types/api';

/**
 * Content registry maps content types to their rendering components.
 *
 * - listItem: Component for rendering in lists/feeds
 * - detail: Component for rendering full detail view (null = no detail page)
 *
 * Note: Detail components will be added in Phase 4 when we add StoryDetail/ProjectDetail.
 */
export const contentRegistry: Record<ContentType, ContentEntry> = {
    story: {
        listItem: null, // StoryCard requires additional props (session, handlers)
        detail: null,   // StoryDetail to be extracted later
    },
    project: {
        listItem: ProjectCard as unknown as ContentEntry<ProjectCardType>['listItem'],
        detail: null,   // ProjectDetail to be extracted later
    },
    page: {
        listItem: null, // Pages don't appear in lists
        detail: null,   // StaticPageDisplay handles pages directly
    },
};

// Type-safe getter for content components
export function getContentComponents<T>(contentType: ContentType): ContentEntry<T> {
    return contentRegistry[contentType] as ContentEntry<T>;
}
```

**Step 2: Update registry index**

Modify `frontend/src/modules/registry/index.ts`:

```ts
// Types
export type {
    DisplayType,
    ContentType,
    ContentEntry,
    FeedDisplayProps,
    CardGridDisplayProps,
    StaticPageDisplayProps,
} from './types';

// Displays
export { FeedDisplay, CardGridDisplay, StaticPageDisplay } from './displays';

// Registries
export { contentRegistry, getContentComponents } from './contentRegistry';
```

**Step 3: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/modules/registry/
git commit -m "feat(registry): add content registry"
```

---

## Task 10: Create Display Registry

Create the display registry mapping display types to their components.

**Files:**
- Create: `frontend/src/modules/registry/displayRegistry.ts`
- Modify: `frontend/src/modules/registry/index.ts`

**Step 1: Create display registry**

Create `frontend/src/modules/registry/displayRegistry.ts`:

```ts
import { ComponentType } from 'react';
import { DisplayType, FeedDisplayProps, CardGridDisplayProps, StaticPageDisplayProps } from './types';
import { FeedDisplay, CardGridDisplay, StaticPageDisplay } from './displays';

/**
 * Display registry maps display types to their layout components.
 *
 * Each display type determines HOW content is laid out:
 * - feed: Infinite scroll list (stories)
 * - card-grid: Responsive grid (projects)
 * - static-page: Single content block (about, contact)
 */
export const displayRegistry: Record<DisplayType, ComponentType<unknown>> = {
    'feed': FeedDisplay as ComponentType<unknown>,
    'card-grid': CardGridDisplay as ComponentType<unknown>,
    'static-page': StaticPageDisplay as ComponentType<unknown>,
};

// Type-safe getters
export function getFeedDisplay(): ComponentType<FeedDisplayProps<unknown>> {
    return FeedDisplay;
}

export function getCardGridDisplay(): ComponentType<CardGridDisplayProps<unknown>> {
    return CardGridDisplay;
}

export function getStaticPageDisplay(): ComponentType<StaticPageDisplayProps> {
    return StaticPageDisplay;
}
```

**Step 2: Update registry index**

Modify `frontend/src/modules/registry/index.ts`:

```ts
// Types
export type {
    DisplayType,
    ContentType,
    ContentEntry,
    FeedDisplayProps,
    CardGridDisplayProps,
    StaticPageDisplayProps,
} from './types';

// Displays
export { FeedDisplay, CardGridDisplay, StaticPageDisplay } from './displays';

// Registries
export { contentRegistry, getContentComponents } from './contentRegistry';
export {
    displayRegistry,
    getFeedDisplay,
    getCardGridDisplay,
    getStaticPageDisplay,
} from './displayRegistry';
```

**Step 3: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/modules/registry/
git commit -m "feat(registry): add display registry"
```

---

## Task 11: Run Full E2E Test Suite

Verify all functionality still works after the refactoring.

**Files:**
- None (verification only)

**Step 1: Run full e2e test suite**

Run: `cd frontend && npm run test:e2e`
Expected: All tests pass

**Step 2: Run lint**

Run: `cd frontend && npm run lint`
Expected: No errors (or only pre-existing warnings)

**Step 3: Run build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 4: Commit any fixes**

If any issues found, fix them and commit:

```bash
git add -A
git commit -m "fix(registry): address issues found in verification"
```

---

## Task 12: Create Implementation Guide

Create the guide for adding new content types.

**Files:**
- Create: `docs-site/pages/guides/creating-content-types.mdx`
- Modify: `docs-site/pages/guides/_meta.ts`
- Modify: `docs-site/pages/guides/index.mdx`

**Step 1: Create the guide**

Create `docs-site/pages/guides/creating-content-types.mdx`:

```mdx
# Creating Content Types

How to add new content types to the registry system.

## Overview

Content types define WHAT is rendered (stories, projects, pages). Display types define HOW it's rendered (feed, grid, static). The registry system connects them.

## Quick Reference

### Adding a New Content Type

1. Create the module: `modules/your-type/`
2. Create card component: `YourTypeCard.tsx`
3. Register in `contentRegistry.ts`
4. Use with appropriate display

## Step-by-Step: Adding a Content Type

### 1. Create the Module

```
frontend/src/modules/experiments/
├── index.ts
└── components/
    ├── index.ts
    └── ExperimentCard.tsx
```

### 2. Create the Card Component

```tsx
// components/ExperimentCard.tsx
import React from 'react';
import Link from 'next/link';

interface ExperimentCardProps {
    item: {
        id: string;
        title: string;
        description: string;
        slug: string;
    };
}

export const ExperimentCard: React.FC<ExperimentCardProps> = ({ item }) => {
    return (
        <Link href={`/experiments/${item.slug}`} className="card card--hoverable">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
        </Link>
    );
};
```

### 3. Export from Module

```ts
// components/index.ts
export { ExperimentCard } from './ExperimentCard';

// index.ts
export * from './components';
```

### 4. Add to Content Registry

In `modules/registry/contentRegistry.ts`:

```ts
import { ExperimentCard } from '@/modules/experiments';

export const contentRegistry = {
    // ... existing types
    experiment: {
        listItem: ExperimentCard,
        detail: null,
    },
};
```

### 5. Update Types

In `modules/registry/types.ts`:

```ts
export type ContentType = 'story' | 'project' | 'page' | 'experiment';
```

### 6. Use in a Page

```tsx
// pages/experiments.tsx
import { CardGridDisplay } from '@/modules/registry';
import { ExperimentCard } from '@/modules/experiments';

export default function ExperimentsPage({ experiments }) {
    return (
        <CardGridDisplay
            items={experiments}
            renderItem={(item) => <ExperimentCard item={item} />}
        />
    );
}
```

## Display Types

| Display | Use Case | Component |
|---------|----------|-----------|
| `feed` | Infinite scroll lists | `FeedDisplay` |
| `card-grid` | Responsive grids | `CardGridDisplay` |
| `static-page` | Single content blocks | `StaticPageDisplay` |

### FeedDisplay Props

```tsx
interface FeedDisplayProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading?: boolean;
}
```

### CardGridDisplay Props

```tsx
interface CardGridDisplayProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
}
```

### StaticPageDisplay Props

```tsx
interface StaticPageDisplayProps {
    content: string;
    title?: string;
}
```

## Best Practices

1. **Keep cards simple** - Card components should only handle rendering
2. **Props-based data** - Parents fetch data, cards receive via props
3. **Type safety** - Define interfaces for your content types
4. **Module structure** - Follow existing module patterns

## What's NOT Handled by Registry

- Data fetching (pages handle this)
- Loading states (parent components)
- Error states (parent components)
- Authentication checks (parent components)
```

**Step 2: Update guides _meta.ts**

Modify `docs-site/pages/guides/_meta.ts`:

```ts
export default {
  index: 'Overview',
  'adding-a-module': 'Adding a Module',
  'creating-content-types': 'Creating Content Types',
  'ssr-patterns': 'SSR Patterns',
  'database-migrations': 'Database Migrations',
  'error-handling-system': 'Error Handling',
  'logging-usage-guide': 'Logging',
  'video-processing-setup': 'Video Processing',
  'github-actions-video-setup': 'GitHub Actions Video Setup'
}
```

**Step 3: Update guides index**

Add to the Frontend section in `docs-site/pages/guides/index.mdx`:

```mdx
- [Creating Content Types](/guides/creating-content-types) - Add new content types to the registry
```

**Step 4: Verify docs build**

Run: `cd docs-site && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add docs-site/pages/guides/
git commit -m "docs: add creating-content-types guide"
```

---

## Task 13: Update Phase 3 Design Document

Mark Phase 3 as complete in the design document.

**Files:**
- Modify: `docs-site/pages/features/dynamic-sections/phase3.mdx`

**Step 1: Update status**

Change line 5 from:
```
**Status:** Design complete, ready for implementation
```

To:
```
**Status:** Complete
```

**Step 2: Commit**

```bash
git add docs-site/pages/features/dynamic-sections/phase3.mdx
git commit -m "docs: mark Phase 3 complete"
```

---

## Final Verification

After all tasks complete:

1. Run full test suite: `cd frontend && npm run test:e2e`
2. Run lint: `cd frontend && npm run lint`
3. Build frontend: `cd frontend && npm run build`
4. Build docs: `cd docs-site && npm run build`

All should pass with no errors.
