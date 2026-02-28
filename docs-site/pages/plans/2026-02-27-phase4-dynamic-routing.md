# Phase 4: Dynamic Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded page routes with a single `[...slugPath]` catch-all that resolves sections from the database and renders content via the display/content registries.

**Architecture:** SSR catch-all route resolves section by slug, fetches content, delegates rendering to registry-mapped components. Generic `useFetchContent` hook handles client-side infinite scroll after initial SSR page. Backend gets `section_id` filter on list endpoints.

**Tech Stack:** Next.js (pages router, getServerSideProps), FastAPI, MongoDB (motor), React hooks, existing registry system

---

### Task 1: Add section_id filter to backend stories endpoint

**Files:**
- Modify: `backend/handlers/stories.py:18-31`
- Test: `backend/tests/test_stories_api.py`

**Step 1: Write the failing test**

Add to `backend/tests/test_stories_api.py` in `TestStoriesPublicEndpoints`:

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_stories_filtered_by_section_id(self, async_client: AsyncClient, override_database):
    """Test filtering stories by section_id"""
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    section_id = ObjectId()
    test_stories = [
        {
            "_id": ObjectId(),
            "title": "Story in section",
            "content": "Content",
            "is_published": True,
            "slug": "story-in-section",
            "date": now,
            "createdDate": now,
            "updatedDate": now,
            "deleted": False,
            "section_id": section_id,
        },
    ]

    override_database.count_documents.return_value = 1
    override_database.find.return_value = MockCursor(test_stories)

    response = await async_client.get(f"/stories?section_id={str(section_id)}")
    assert response.status_code == 200

    # Verify the query included section_id filter
    call_args = override_database.find.call_args
    query = call_args[0][0] if call_args[0] else call_args[1].get("filter", {})
    assert "section_id" in query
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_stories_api.py::TestStoriesPublicEndpoints::test_get_stories_filtered_by_section_id -v`
Expected: FAIL — query does not include section_id

**Step 3: Write minimal implementation**

In `backend/handlers/stories.py`, add `section_id` parameter and filter:

```python
from bson import ObjectId

@router.get("/stories")
async def get_stories(
    request: Request,
    response: Response,
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    include_drafts: bool = Query(False),
    section_id: str | None = Query(None),
    collection: AsyncIOMotorCollection = Depends(get_collection),
):
    try:
        query = {"deleted": {"$ne": True}}
        if not include_drafts:
            query["is_published"] = True
        if section_id:
            query["section_id"] = ObjectId(section_id)
        # ... rest unchanged
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_stories_api.py::TestStoriesPublicEndpoints::test_get_stories_filtered_by_section_id -v`
Expected: PASS

**Step 5: Run full test suite**

Run: `cd backend && python -m pytest tests/test_stories_api.py -v`
Expected: All tests pass

**Step 6: Commit**

```bash
git add backend/handlers/stories.py backend/tests/test_stories_api.py
git commit -m "feat(backend): add section_id filter to stories endpoint"
```

---

### Task 2: Add section_id filter to backend projects endpoint

**Files:**
- Modify: `backend/handlers/projects.py:22-42`
- Test: `backend/tests/test_projects_api.py`

**Step 1: Write the failing test**

Add to `backend/tests/test_projects_api.py` in the public endpoints test class:

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_projects_filtered_by_section_id(self, async_client: AsyncClient, override_projects_database):
    """Test filtering projects by section_id"""
    section_id = ObjectId()
    test_projects = [
        {
            "_id": ObjectId(),
            "title": "Project in section",
            "slug": "project-in-section",
            "summary": "Summary",
            "technologies": ["Python"],
            "image_url": None,
            "github_url": None,
            "live_url": None,
            "is_featured": False,
            "is_published": True,
            "deleted": False,
            "section_id": section_id,
        },
    ]

    override_projects_database.count_documents.return_value = 1
    override_projects_database.find.return_value = MockCursor(test_projects)

    response = await async_client.get(f"/projects?section_id={str(section_id)}")
    assert response.status_code == 200

    call_args = override_projects_database.find.call_args
    query = call_args[0][0] if call_args[0] else call_args[1].get("filter", {})
    assert "section_id" in query
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_projects_api.py::TestProjectsPublicEndpoints::test_get_projects_filtered_by_section_id -v`
Expected: FAIL

**Step 3: Write minimal implementation**

In `backend/handlers/projects.py`, add `section_id` parameter:

```python
@router.get("/projects")
async def get_projects(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_unpublished: bool = Query(False),
    featured_only: bool = Query(False),
    section_id: str | None = Query(None),
    collection: AsyncIOMotorCollection = Depends(get_projects_collection),
):
    # ... existing code ...
    query = {"deleted": {"$ne": True}}
    if not include_unpublished:
        query["is_published"] = True
    if featured_only:
        query["is_featured"] = True
    if section_id:
        query["section_id"] = ObjectId(section_id)
    # ... rest unchanged
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_projects_api.py -v`
Expected: All pass

**Step 5: Commit**

```bash
git add backend/handlers/projects.py backend/tests/test_projects_api.py
git commit -m "feat(backend): add section_id filter to projects endpoint"
```

---

### Task 3: Add Section type to frontend API types

**Files:**
- Modify: `frontend/src/shared/types/api.ts`

**Step 1: Add Section type and update pagination params**

At the end of the types file, before the engagement types section, add:

```typescript
/**
 * Section types for dynamic routing
 */
export type DisplayType = 'feed' | 'card-grid' | 'static-page' | 'gallery';
export type SectionContentType = 'story' | 'project' | 'page' | 'image';
export type NavVisibility = 'main' | 'secondary' | 'hidden';

export interface Section {
    id: string;
    title: string;
    slug: string;
    display_type: DisplayType;
    content_type: SectionContentType;
    nav_visibility: NavVisibility;
    sort_order: number;
    is_published: boolean;
    parent_id: string | null;
    createdDate: string;
    updatedDate: string;
    user_id?: string;
}
```

Add `section_id` to both pagination interfaces:

```typescript
interface PaginationParams {
  limit?: number;
  offset?: number;
  include_drafts?: boolean;
  section_id?: string;
}

interface ProjectPaginationParams {
  limit?: number;
  offset?: number;
  featured_only?: boolean;
  section_id?: string;
}
```

Note: `PaginationParams` and `ProjectPaginationParams` are defined in `frontend/src/shared/lib/api-client.ts`, not in `api.ts`. Add the Section type to `api.ts`, update the pagination interfaces in `api-client.ts`.

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/shared/types/api.ts frontend/src/shared/lib/api-client.ts
git commit -m "feat(frontend): add Section type and section_id to pagination params"
```

---

### Task 4: Add sections API route and client methods

**Files:**
- Create: `frontend/src/pages/api/sections/by-slug/[slug].ts`
- Modify: `frontend/src/shared/lib/api-client.ts`

**Step 1: Create the sections proxy API route**

```typescript
// frontend/src/pages/api/sections/by-slug/[slug].ts
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!API_BASE_URL) {
        return res.status(500).json({ detail: 'Backend URL not configured' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ detail: 'Method not allowed' });
    }

    const { slug } = req.query;
    if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ detail: 'Slug is required' });
    }

    try {
        const response = await fetch(`${API_BASE_URL}/sections/by-slug/${slug}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();

        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching section by slug:', error);
        return res.status(500).json({
            detail: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
```

**Step 2: Add section_id passthrough to stories proxy**

In `frontend/src/pages/api/stories.ts`, add section_id to the params block (around line 105-122):

```typescript
if (req.query.section_id) {
    params.append('section_id', req.query.section_id.toString());
}
```

Update `getCacheKey` (line 10-12) to include section_id:

```typescript
function getCacheKey(req: NextApiRequest): string {
    const { limit, offset, include_drafts, section_id } = req.query;
    return `stories:${limit || 'all'}:${offset || 0}:${include_drafts || 'false'}:${section_id || 'none'}`;
}
```

**Step 3: Add section_id passthrough to projects proxy**

In `frontend/src/pages/api/projects/index.ts`, add section_id to the params block (around line 91-110):

```typescript
if (req.query.section_id) {
    params.append('section_id', req.query.section_id.toString());
}
```

Update `getCacheKey` (line 9-11):

```typescript
function getCacheKey(req: NextApiRequest): string {
    const { limit, offset, featured_only, section_id } = req.query;
    return `projects:${limit || 'all'}:${offset || 0}:${featured_only || 'false'}:${section_id || 'none'}`;
}
```

**Step 4: Add sections methods to api-client.ts**

Add to `apiRoutes`:

```typescript
sections: {
    getBySlug: (slug: string) => `/api/sections/by-slug/${slug}`,
},
```

Add to `apiClient`:

```typescript
sections: {
    getBySlug: (slug: string) =>
        fetchApi<Section>(apiRoutes.sections.getBySlug(slug)),
},
```

Import `Section` from the types.

**Step 5: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add frontend/src/pages/api/sections/ frontend/src/pages/api/stories.ts frontend/src/pages/api/projects/index.ts frontend/src/shared/lib/api-client.ts
git commit -m "feat(frontend): add sections API route and section_id passthrough"
```

---

### Task 5: Create useFetchContent generic hook

**Files:**
- Create: `frontend/src/modules/registry/hooks/useFetchContent.ts`
- Create: `frontend/src/modules/registry/hooks/index.ts`
- Modify: `frontend/src/modules/registry/index.ts`

**Step 1: Create the hook**

Pattern is based on `frontend/src/modules/stories/hooks/useFetchStories.ts` but generic over content type.

```typescript
// frontend/src/modules/registry/hooks/useFetchContent.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { PaginatedResponse } from '@/shared/types/api';
import type { ContentType } from '../types';

const PAGE_SIZE = 10;

export interface UseFetchContentOptions<T> {
    contentType: ContentType;
    sectionId?: string;
    initialData?: PaginatedResponse<T>;
    pageSize?: number;
}

export interface UseFetchContentReturn<T> {
    items: T[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    total: number;
    loadMore: () => void;
    reset: () => void;
}

const contentFetchers: Record<ContentType, (token?: string, params?: Record<string, string | number>) => Promise<PaginatedResponse<any>>> = {
    story: (token, params) => apiClient.stories.list(token, params),
    project: (_token, params) => apiClient.projects.list(params),
    page: () => Promise.resolve({ items: [], total: 0, limit: 0, offset: 0 }),
};

export function useFetchContent<T>(options: UseFetchContentOptions<T>): UseFetchContentReturn<T> {
    const { contentType, sectionId, initialData, pageSize = PAGE_SIZE } = options;
    const { data: session } = useSession();

    const [items, setItems] = useState<T[]>(initialData?.items || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(
        initialData ? initialData.items.length < initialData.total : true
    );
    const [total, setTotal] = useState(initialData?.total || 0);

    const offsetRef = useRef(initialData?.items.length || 0);
    const isMountedRef = useRef(false);
    const tokenRef = useRef(session?.accessToken);
    const loadingRef = useRef(false);
    const hasMoreRef = useRef(hasMore);

    useEffect(() => { loadingRef.current = loading; }, [loading]);
    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { tokenRef.current = session?.accessToken; }, [session?.accessToken]);

    const fetchInternal = useCallback(async (reset = false) => {
        if (loadingRef.current) return;

        if (reset) {
            offsetRef.current = 0;
            setItems([]);
            setHasMore(true);
            hasMoreRef.current = true;
        }

        if (!reset && !hasMoreRef.current) return;

        setLoading(true);
        loadingRef.current = true;
        setError(null);

        try {
            const params: Record<string, string | number> = {
                limit: pageSize,
                offset: offsetRef.current,
            };
            if (sectionId) {
                params.section_id = sectionId;
            }
            if (contentType === 'story' && session?.accessToken) {
                params.include_drafts = 1;
            }

            const fetcher = contentFetchers[contentType];
            const response = await fetcher(tokenRef.current, params);

            setTotal(response.total);
            setItems(prev => reset ? response.items : [...prev, ...response.items]);

            offsetRef.current += response.items.length;
            const newHasMore = offsetRef.current < response.total;
            setHasMore(newHasMore);
            hasMoreRef.current = newHasMore;
        } catch (err) {
            const message = err instanceof ApiRequestError ? err.message : `Failed to fetch ${contentType} content`;
            setError(message);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [contentType, sectionId, pageSize, session?.accessToken]);

    useEffect(() => {
        if (!isMountedRef.current) {
            isMountedRef.current = true;
            if (!initialData || initialData.items.length === 0) {
                fetchInternal(true);
            }
        }
    }, [fetchInternal, initialData]);

    useEffect(() => {
        if (isMountedRef.current) {
            fetchInternal(true);
        }
    }, [session?.accessToken, fetchInternal]);

    const loadMore = useCallback(() => fetchInternal(false), [fetchInternal]);
    const reset = useCallback(() => fetchInternal(true), [fetchInternal]);

    return { items, loading, error, hasMore, total, loadMore, reset };
}
```

**Step 2: Create hooks index**

```typescript
// frontend/src/modules/registry/hooks/index.ts
export { useFetchContent } from './useFetchContent';
export type { UseFetchContentOptions, UseFetchContentReturn } from './useFetchContent';
```

**Step 3: Export from registry module**

Add to `frontend/src/modules/registry/index.ts`:

```typescript
export { useFetchContent } from './hooks';
export type { UseFetchContentOptions, UseFetchContentReturn } from './hooks';
```

**Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/modules/registry/hooks/ frontend/src/modules/registry/index.ts
git commit -m "feat(registry): add generic useFetchContent hook"
```

---

### Task 6: Create the [...slugPath] catch-all route

**Files:**
- Create: `frontend/src/pages/[...slugPath].tsx`

This is the core of Phase 4. The route:
1. Resolves section by first slug segment via `getServerSideProps`
2. Fetches initial content (list or detail)
3. Renders via registry (display component for lists, detail component for items)
4. Hands off to `useFetchContent` for client-side infinite scroll on list views

**Step 1: Create the catch-all route**

```typescript
// frontend/src/pages/[...slugPath].tsx
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Section, PaginatedResponse, Story, Page as PageType } from '@/shared/types/api';
import { displayRegistry, contentRegistry, useFetchContent } from '@/modules/registry';
import { EngagementProvider, ReactionBar, CommentSection, useEngagementContext } from '@/modules/engagement';
import { useStoryMutations } from '@/modules/stories/hooks';

interface DynamicPageProps {
    section: Section;
    items?: any[];
    item?: any;
    total?: number;
    viewMode: 'list' | 'detail';
    error?: string;
    ogImage?: string;
    excerpt?: string;
}

function StoryEngagement() {
    const { reactions, comments, isLoading, toggleReaction, addComment, deleteComment } = useEngagementContext();
    return (
        <>
            <div className="mt-8 border-t pt-8">
                <ReactionBar reactions={reactions} onToggle={toggleReaction} />
            </div>
            <div className="mt-8">
                <CommentSection
                    comments={comments}
                    onAddComment={addComment}
                    onDeleteComment={deleteComment}
                    isLoading={isLoading}
                />
            </div>
        </>
    );
}

function SectionListView({ section, initialItems, total }: {
    section: Section;
    initialItems: any[];
    total: number;
}) {
    const { data: session } = useSession();
    const router = useRouter();
    const DisplayComponent = displayRegistry[section.display_type as keyof typeof displayRegistry];
    const contentEntry = contentRegistry[section.content_type as keyof typeof contentRegistry];
    const ListItemComponent = contentEntry?.listItem;

    const { items, loadMore, hasMore } = useFetchContent({
        contentType: section.content_type as any,
        sectionId: section.id,
        initialData: { items: initialItems, total, limit: 10, offset: 0 },
    });

    if (!DisplayComponent || !ListItemComponent) {
        return <div>Unknown display or content type</div>;
    }

    // Story list needs extra props (session, edit/delete handlers, engagement)
    // For now, render items through the display component's renderItem pattern
    const renderItem = (item: any) => {
        return <ListItemComponent key={item.id} item={item} />;
    };

    return (
        <DisplayComponent
            items={items}
            renderItem={renderItem}
            onLoadMore={loadMore}
            hasMore={hasMore}
        />
    );
}

function SectionDetailView({ section, item }: {
    section: Section;
    item: any;
    ogImage?: string;
    excerpt?: string;
}) {
    const contentEntry = contentRegistry[section.content_type as keyof typeof contentRegistry];
    const DetailComponent = contentEntry?.detail;

    if (!DetailComponent || !item) {
        return <div>Content not found</div>;
    }

    // Stories get engagement integration
    if (section.content_type === 'story') {
        return (
            <EngagementProvider targetType="story" targetId={item.id}>
                <DetailComponent story={item}>
                    <StoryEngagement />
                    <div className="mt-10 pt-6">
                        <Link href={`/${section.slug}`} className="btn btn--secondary btn--sm">
                            &larr; Back to {section.title}
                        </Link>
                    </div>
                </DetailComponent>
            </EngagementProvider>
        );
    }

    // Projects get a back link
    if (section.content_type === 'project') {
        return (
            <>
                <Link href={`/${section.slug}`} className="inline-block mb-6 btn btn--secondary btn--sm">
                    &larr; Back to {section.title}
                </Link>
                <DetailComponent project={item} />
            </>
        );
    }

    return <DetailComponent item={item} />;
}

export default function DynamicPage({ section, items, item, total, viewMode, error, ogImage, excerpt }: DynamicPageProps) {
    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <h3 className="text-red-800 font-semibold">Error</h3>
                    <p className="text-red-600 mt-2">{error}</p>
                    <Link href="/" className="btn btn--primary">Return Home</Link>
                </div>
            </div>
        );
    }

    const title = viewMode === 'detail' && item?.title
        ? `${item.title} | Turbulence`
        : `${section.title} | Turbulence`;

    const description = viewMode === 'detail' && excerpt
        ? excerpt
        : `${section.title} on ghostmonk.com`;

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                {viewMode === 'detail' && ogImage && (
                    <>
                        <meta property="og:title" content={item?.title || section.title} />
                        <meta property="og:description" content={description} />
                        <meta property="og:type" content="article" />
                        <meta property="og:image" content={ogImage} />
                    </>
                )}
            </Head>

            <div style={{ margin: '0 auto', maxWidth: '800px', padding: '2rem 1rem' }}>
                {viewMode === 'list' && (
                    <>
                        <h1 className="page-title">{section.title}</h1>
                        <SectionListView section={section} initialItems={items || []} total={total || 0} />
                    </>
                )}
                {viewMode === 'detail' && (
                    <SectionDetailView section={section} item={item} ogImage={ogImage} excerpt={excerpt} />
                )}
            </div>
        </>
    );
}

export const getServerSideProps: GetServerSideProps<DynamicPageProps> = async (context) => {
    const slugPath = context.params?.slugPath as string[];
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!backendUrl || !slugPath || slugPath.length === 0) {
        return { notFound: true };
    }

    const sectionSlug = slugPath[0];
    const contentSlug = slugPath.length > 1 ? slugPath[1] : null;

    // More than 2 segments not supported (flat routing)
    if (slugPath.length > 2) {
        return { notFound: true };
    }

    try {
        // 1. Resolve section
        const sectionRes = await fetch(`${backendUrl}/sections/by-slug/${sectionSlug}`);
        if (!sectionRes.ok) {
            return { notFound: true };
        }
        const section: Section = await sectionRes.json();

        // 2. Static page — fetch page content
        if (section.display_type === 'static-page') {
            if (contentSlug) {
                return { notFound: true }; // No detail view for static pages
            }

            // Static pages use page_type matching section slug
            const pageRes = await fetch(`${backendUrl}/pages/${sectionSlug}`);
            if (!pageRes.ok) {
                return {
                    props: { section, viewMode: 'list' as const, items: [] }
                };
            }
            const page = await pageRes.json();

            return {
                props: {
                    section,
                    viewMode: 'list' as const,
                    items: [page],
                }
            };
        }

        // 3. Detail view — fetch single item by slug
        if (contentSlug) {
            const contentEndpoint = section.content_type === 'story'
                ? `${backendUrl}/stories/slug/${contentSlug}`
                : `${backendUrl}/projects/slug/${contentSlug}`;

            const itemRes = await fetch(contentEndpoint);
            if (!itemRes.ok) {
                return { notFound: true };
            }
            const item = await itemRes.json();

            // Process OG data for stories
            let ogImage: string | undefined;
            let excerpt: string | undefined;
            if (section.content_type === 'story' && item.content) {
                const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/);
                ogImage = imgMatch ? imgMatch[1] : undefined;
                const textContent = item.content.replace(/<[^>]+>/g, '').trim();
                excerpt = textContent.length > 160 ? textContent.substring(0, 157) + '...' : textContent;
            }

            return {
                props: {
                    section,
                    viewMode: 'detail' as const,
                    item,
                    ogImage: ogImage || null,
                    excerpt: excerpt || null,
                }
            };
        }

        // 4. List view — fetch first page of content
        const contentEndpoint = section.content_type === 'story'
            ? `${backendUrl}/stories?limit=10&section_id=${section.id}`
            : `${backendUrl}/projects?limit=20&section_id=${section.id}`;

        const contentRes = await fetch(contentEndpoint);
        if (!contentRes.ok) {
            return {
                props: { section, viewMode: 'list' as const, items: [], total: 0 }
            };
        }
        const contentData = await contentRes.json();

        return {
            props: {
                section,
                viewMode: 'list' as const,
                items: contentData.items || [],
                total: contentData.total || 0,
            }
        };
    } catch (error) {
        console.error('Error in dynamic route SSR:', error);
        return { notFound: true };
    }
};
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors (may need type adjustments)

**Step 3: Commit**

```bash
git add frontend/src/pages/\[...slugPath\].tsx
git commit -m "feat(frontend): add catch-all dynamic route with registry wiring"
```

---

### Task 7: Remove old route files

**Files:**
- Delete: `frontend/src/pages/about.tsx`
- Delete: `frontend/src/pages/contact.tsx`
- Delete: `frontend/src/pages/projects.tsx`
- Delete: `frontend/src/pages/projects/[slug].tsx`
- Delete: `frontend/src/pages/stories/[slug].tsx`

**Step 1: Delete the files**

```bash
rm frontend/src/pages/about.tsx
rm frontend/src/pages/contact.tsx
rm frontend/src/pages/projects.tsx
rm frontend/src/pages/projects/\[slug\].tsx
rm frontend/src/pages/stories/\[slug\].tsx
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors. If other files import from deleted files, fix those imports.

**Step 3: Verify build succeeds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A frontend/src/pages/
git commit -m "refactor(frontend): remove old route files replaced by catch-all"
```

---

### Task 8: Update internal links

**Files:**
- Check and update: Any hardcoded links to `/stories/`, `/projects/`, `/about`, `/contact`

**Step 1: Search for hardcoded route references**

Search for links that may need updating. The catch-all handles the same URL patterns, so most links should work. But verify:
- Links in layout/nav components
- Links in StoryCard, ProjectCard (back links)
- Links in the editor

**Step 2: Fix any broken references**

The catch-all serves the same URLs, so internal links like `/stories/my-post` or `/projects/my-project` should still resolve. The key change is that these now go through `[...slugPath]` instead of dedicated route files.

Verify the stories/[slug] route for the story detail — the slug format must match what the backend returns.

**Step 3: Commit if changes needed**

```bash
git add -A
git commit -m "fix(frontend): update internal links for dynamic routing"
```

---

### Task 9: Run full test suite and build verification

**Files:** None (verification only)

**Step 1: Run backend tests**

Run: `cd backend && python -m pytest -v`
Expected: All tests pass

**Step 2: Run frontend type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: No errors

**Step 4: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 5: Run format check**

Run: `make format-check`
Expected: No formatting issues

---

### Task 10: Update documentation

**Files:**
- Modify: `docs-site/pages/features/dynamic-sections/phase4.mdx` (already created, update with final details)
- Modify: `docs-site/pages/guides/creating-content-types.mdx` (update routing section)
- Modify: `docs-site/pages/features/dynamic-sections/_meta.ts` (already updated)

**Step 1: Update the phase4 doc with final implementation notes**

Add a "Status: Implemented" section and any deviations from the original design.

**Step 2: Update creating-content-types guide**

Add a section explaining how new content types automatically get routing when:
1. A section is created in the database with the new content_type
2. Components are registered in contentRegistry and displayRegistry
3. The catch-all route handles it automatically

**Step 3: Commit**

```bash
git add docs-site/
git commit -m "docs: update Phase 4 documentation and content types guide"
```
