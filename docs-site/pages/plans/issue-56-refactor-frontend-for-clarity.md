# Issue #56: Refactor Frontend for Clarity

## Overview
Simplify and clarify the frontend codebase for readability, improve architecture without changing functionality. Focus on reducing footprint, improving separation of concerns, and increasing cohesion/modularity.

## Current State
- **5,505 lines** of TypeScript/TSX
- 12 components, 2 hook files, 7 utility modules
- Well-structured but with duplication and complexity hotspots

## Key Problem Areas

| Area | Issue | Impact |
|------|-------|--------|
| `useStories.ts` (405 lines) | 3 hooks in one file, ref-heavy | Hard to maintain |
| `RichTextEditor.tsx` (348 lines) | Upload handlers mixed with editor logic | Low cohesion |
| `pages/editor.tsx` (301 lines) | Multiple useEffects, form state sprawl | Complex flow |
| Error handling | Same pattern repeated 5+ times | Duplication |
| Loading states | `[loading, error]` pattern repeated 10+ times | Duplication |
| Token management | Scattered across hooks, routes, services | Low cohesion |

---

## Refactoring Plan

### Phase 1: Extract & Consolidate Hooks

**1.1 Split `useStories.ts` into focused modules**
```
src/hooks/
├── stories/
│   ├── useFetchStories.ts    # Infinite scroll, pagination
│   ├── useFetchStory.ts      # Single story fetching
│   ├── useStoryMutations.ts  # Create, update, delete operations
│   └── index.ts              # Re-exports
```

**1.2 Create generic utility hooks**
```
src/hooks/
├── useAsync.ts               # Generic async state (loading, error, data)
├── useApiRequest.ts          # Wraps fetch with error handling
└── useErrorHandler.ts        # Centralized error state management
```

### Phase 2: Extract Upload Logic from RichTextEditor

**2.1 Create dedicated upload hooks**
```
src/hooks/
├── uploads/
│   ├── useImageUpload.ts     # Image upload with validation
│   ├── useVideoUpload.ts     # Video upload with validation
│   └── useFileUpload.ts      # Shared upload logic
```

**2.2 Consolidate file validation**
- Merge `validateImageFile` and `validateVideoFile` into generic `validateFile(file, config)`
- Move to `src/utils/fileValidation.ts`

### Phase 3: Simplify Editor Page

**3.1 Extract form logic**
```
src/hooks/
├── editor/
│   ├── useStoryForm.ts       # Form state, validation, submit
│   ├── useAutoSave.ts        # Autosave logic
│   └── useEditorSession.ts   # Token expiration, session management
```

**3.2 Reduce editor.tsx to orchestration only**
- Page should only wire hooks together
- Target: < 100 lines

### Phase 4: Centralize Token/Auth Management

**4.1 Create auth context**
```
src/contexts/
├── AuthContext.tsx           # Token state, refresh logic
└── useAuth.ts                # Hook to access auth context
```

**4.2 Remove token passing**
- Hooks read token from context instead of parameters
- API client reads token from context

### Phase 5: Reduce Duplication

**5.1 Generic async state pattern**
Replace repeated:
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<T | null>(null);
```
With:
```typescript
const { data, loading, error, execute } = useAsync<T>();
```

**5.2 Standardize error handling**
Replace repeated try/catch patterns with:
```typescript
const { execute, error } = useApiRequest(apiClient.stories.create);
```

---

## Target File Structure

```
src/
├── components/           # UI only - no business logic
│   ├── editor/
│   │   ├── RichTextEditor.tsx    # Reduced to UI rendering
│   │   ├── EditorToolbar.tsx     # Extracted toolbar
│   │   └── VideoExtension.tsx
│   ├── stories/
│   │   ├── StoryCard.tsx         # Renamed from implicit in Stories.tsx
│   │   ├── StoryList.tsx         # List rendering only
│   │   └── StoryProgress.tsx
│   ├── common/
│   │   ├── ErrorDisplay.tsx
│   │   ├── LoadingSkeletons.tsx
│   │   └── LazyImage.tsx
│   └── layout/
│       ├── TopNav.tsx
│       ├── Layout.tsx
│       └── ThemeToggle.tsx
├── hooks/
│   ├── stories/              # Story-specific hooks
│   ├── uploads/              # Upload hooks
│   ├── editor/               # Editor page hooks
│   ├── useAsync.ts           # Generic async state
│   ├── useApiRequest.ts      # API wrapper
│   └── useAuth.ts            # Auth context hook
├── contexts/
│   └── AuthContext.tsx       # Centralized auth state
├── services/                 # Business logic
│   └── errorService.ts
├── lib/                      # Infrastructure
│   ├── api-client.ts
│   └── logging/
├── utils/                    # Pure functions
│   ├── fileValidation.ts     # Consolidated validation
│   ├── sanitizer.ts
│   ├── urls.ts
│   └── formatDate.ts
├── types/
└── pages/                    # Thin orchestration layer
```

---

## Implementation Order

1. **Create generic hooks** (`useAsync`, `useApiRequest`) - foundation for other changes
2. **Split useStories.ts** - largest complexity reduction
3. **Extract upload hooks** - decouple from RichTextEditor
4. **Create AuthContext** - centralize token management
5. **Simplify editor.tsx** - extract form/session hooks
6. **Reorganize components** - folder structure cleanup
7. **Consolidate file validation** - final duplication removal

---

## Success Criteria

- [ ] Each hook does ONE thing
- [ ] Components contain UI logic only
- [ ] Zero duplicated error/loading patterns
- [ ] Token management in single location
- [ ] All existing functionality preserved
- [ ] No new dependencies added
- [ ] Reduce cyclomatic complexity - functions should have few branches/paths; high branching and imperative code hurt readability and comprehension, prefer declarative patterns
- [ ] Files > 500 lines require strong justification (shorter is better, but not a hard limit)

---

## Files to Modify/Create

### Modify
- `src/hooks/useStories.ts` → split into 3 files
- `src/components/RichTextEditor.tsx` → extract upload logic
- `src/pages/editor.tsx` → extract form/session logic
- `src/utils/uploadUtils.ts` → consolidate validation

### Create
- `src/hooks/useAsync.ts`
- `src/hooks/useApiRequest.ts`
- `src/hooks/stories/useFetchStories.ts`
- `src/hooks/stories/useFetchStory.ts`
- `src/hooks/stories/useStoryMutations.ts`
- `src/hooks/uploads/useImageUpload.ts`
- `src/hooks/uploads/useVideoUpload.ts`
- `src/hooks/editor/useStoryForm.ts`
- `src/hooks/editor/useAutoSave.ts`
- `src/contexts/AuthContext.tsx`

### Delete (after migration)
- Original `useStories.ts` (replaced by split files)

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Duplicated patterns | 15+ occurrences | 0 |
| Hook files | 2 (large, multi-purpose) | ~10 (focused, single-purpose) |
| Token passing | Throughout codebase | Centralized in AuthContext |
| Separation of concerns | Mixed in components | Clear layers (UI / hooks / services) |
