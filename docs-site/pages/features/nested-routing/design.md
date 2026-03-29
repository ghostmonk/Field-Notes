# Nested Routing Design

**Status:** Design
**Supersedes:** Dynamic Sections (flat routing with `content_type` on sections)
**Goal:** Arbitrary-depth content hierarchy with filesystem semantics, movable content, and automatic redirects.

---

## Problem

The current routing system is flat. Sections map 1:1 to top-level URL segments. A section like `projects` can only contain content items at `/projects/{slug}` — there is no way to nest sections inside sections, and no way to create deep organizational structures like `/creative-work/photography/portraits/some-photo-essay`.

Content types are encoded into the section definition via `content_type`, which forces every section to contain exactly one kind of content. A section cannot hold both blog posts and projects, or present a mixed broadsheet of child content.

## Core Principles

**Sections are folders.** Every section can contain both child sections and content items. There is no distinction between a "folder section" and a "leaf section." A section at any depth can hold children of any kind.

**Content types live on content items, not sections.** A story knows it's a story. A photo essay knows it's a photo essay. The section it lives in doesn't need to know or care. This means a single section can contain stories, projects, film reviews, and podcasts side by side.

**Display types live on sections.** A section decides how to render its children: card grid, infinite scroll, gallery, broadsheet. The display type operates on a uniform listing interface that all content types implement. A card grid of mixed stories and projects renders identically at the list level.

**Filesystem semantics for URLs.** The full URL of a content item is `{section.path}/{item.slug}`. Moving content or renaming a section changes URLs. The system writes 301 redirects automatically so old URLs continue to work.

**Subtree scoping.** A section can only display content from its own subtree. The root section (`/`) can display anything. A section at `/creative-work/` can display anything under creative-work, but not content under `/about/`. This is enforced at the query level, not by convention.

---

## Design Decisions

| Concept | Decision | Reasoning |
|---------|----------|-----------|
| Hierarchy depth | Unlimited nesting via `parent_id` + materialized `path` | Filesystem model requires arbitrary depth |
| Content type on sections | Removed | Sections render any content type; type lives on the item |
| Slug uniqueness | Unique within parent, not globally | Mirrors filesystem — `a/draft` and `b/draft` can coexist |
| Path resolution | Single backend endpoint resolves full path | Frontend stays simple — one HTTP call regardless of depth |
| Content moves | Update `section_id` + write redirect | Old URLs return 301 to new location |
| Section moves | Cascade path updates + bulk redirects | All descendants and their content get new paths |
| Display type | Section-level only | Determines how children render in list view |
| Listing interface | Uniform shape across all content types | Display components don't need to know content types |
| Broadsheet display | Pulls flagged items from subtree | Root broadsheet can show anything; nested broadsheets scoped to subtree |

---

## Architecture Overview

```
URL: /creative-work/photography/portraits/beach-sunset

Frontend catch-all [...slugPath]
        |
        v
GET /sections/resolve-path/creative-work/photography/portraits/beach-sunset
        |
        v
Backend walks the path:
  1. "creative-work" -> section (exists)
  2. "photography"   -> child section of creative-work (exists)
  3. "portraits"     -> child section of photography (exists)
  4. "beach-sunset"  -> not a section -> treat as content item in "portraits"
        |
        v
Returns: { section: portraits, content_item: beach-sunset, breadcrumbs: [...] }
        |
        v
Frontend renders:
  - If content_item: detail view based on content_item.content_type
  - If section only: list view using section.display_type
```

---

## What Changes from Dynamic Sections

| Aspect | Dynamic Sections (current) | Nested Routing (new) |
|--------|---------------------------|----------------------|
| URL depth | 2 levels max (`/section/item`) | Unlimited |
| Section nesting | `parent_id` exists but unused in routing | Fully resolved in routing |
| `content_type` on section | Required, determines what API to call | Removed |
| Content in a section | All same type | Mixed types allowed |
| Path resolution | Frontend splits URL into 1-2 segments | Backend resolves full path |
| Content moves | Not supported | Supported with 301 redirects |
| Display types | Tied to content type | Independent of content type |
| List rendering | Type-specific list components | Uniform `ListingItem` interface |
