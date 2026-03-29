import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import {
  sampleStories,
  samplePages,
  sampleProjects,
  sampleSections,
  allSections,
  nestedSections,
  projectToCard,
  FIXED_TIMESTAMP,
  sampleReactions,
  sampleComments,
  createTestComment,
  createTestSection,
  samplePhotoEssayCards,
  samplePhotoEssayDetail,
  sampleResume,
  sampleBlogChildren,
  TEST_SECTION_IDS,
} from './test-data';

const app = express();

/**
 * Mock API Server for E2E Testing
 *
 * This Express server handles SSR (Server-Side Rendering) requests from Next.js.
 * When Next.js calls getServerSideProps or getStaticProps, it fetches data from
 * this server (via BACKEND_URL environment variable).
 *
 * Client-side API requests are handled separately by Playwright's page.route()
 * in the test fixtures (e2e/fixtures/api-mock.fixture.ts).
 *
 * Note: This server is intentionally stateless - mutations (POST/PUT/DELETE)
 * return success responses but don't modify the in-memory data. This simplifies
 * testing and avoids state pollution between tests. For mutation testing,
 * use the per-test route mocking in fixtures.
 *
 * Test data is shared with fixtures via e2e/test-data.ts to ensure consistency.
 */

// Enable CORS for Next.js dev server only
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[Mock API] ${req.method} ${req.path}`);
  next();
});

// Use shared sample stories from test-data.ts
const stories = [...sampleStories];

// GET /stories - List stories with pagination (supports both page/size and limit/offset)
app.get('/stories', (req: Request, res: Response) => {
  // Support both pagination styles with safe parsing and validation
  const limit = Math.max(1, parseInt(req.query.limit as string || req.query.size as string || '10', 10) || 10);
  const offset = Math.max(0, parseInt(req.query.offset as string || '0', 10) || 0);
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10) || 1);

  // Calculate start position (prefer offset if provided, otherwise use page)
  const hasOffset = req.query.offset !== undefined;
  const start = hasOffset ? offset : (page - 1) * limit;
  const pageStories = stories.slice(start, start + limit);

  res.json({
    items: pageStories,
    total: stories.length,
    page: hasOffset ? Math.floor(offset / limit) + 1 : page,
    size: limit,
    pages: Math.ceil(stories.length / limit),
  });
});

// GET /stories/slug/:slug - Get story by slug
app.get('/stories/slug/:slug', (req: Request, res: Response) => {
  const story = stories.find((s) => s.slug === req.params.slug);
  if (story) {
    res.json(story);
  } else {
    res.status(404).json({ detail: 'Story not found' });
  }
});

// GET /stories/:id - Get story by ID
app.get('/stories/:id', (req: Request, res: Response) => {
  const story = stories.find((s) => s.id === req.params.id);
  if (story) {
    res.json(story);
  } else {
    res.status(404).json({ detail: 'Story not found' });
  }
});

// POST /stories - Create story (returns success but doesn't persist - see header comment)
app.post('/stories', (req: Request, res: Response) => {
  const newStory = {
    id: `story-${Date.now()}`,
    ...req.body,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  };
  res.status(201).json(newStory);
});

// PUT /stories/:id - Update story (returns success but doesn't persist - see header comment)
app.put('/stories/:id', (req: Request, res: Response) => {
  const story = stories.find((s) => s.id === req.params.id);
  if (story) {
    res.json({ ...story, ...req.body, updatedDate: FIXED_TIMESTAMP });
  } else {
    res.status(404).json({ detail: 'Story not found' });
  }
});

// DELETE /stories/:id - Delete story
app.delete('/stories/:id', (req: Request, res: Response) => {
  res.status(204).send();
});

// POST /upload/:type - Mock file uploads
app.post('/upload/:type', (req: Request, res: Response) => {
  res.json({ url: '/mock-uploaded-file.jpg' });
});

// ============================================================================
// Pages (About, Contact)
// ============================================================================

// Use shared sample pages from test-data.ts
const pages = [...samplePages];

// GET /pages/:pageType - Get page by type
app.get('/pages/:pageType', (req: Request, res: Response) => {
  const page = pages.find((p) => p.page_type === req.params.pageType);
  if (page) {
    res.json(page);
  } else {
    res.status(404).json({ detail: `Page '${req.params.pageType}' not found` });
  }
});

// PUT /pages/:pageType - Update page (returns success but doesn't persist)
app.put('/pages/:pageType', (req: Request, res: Response) => {
  const existingPage = pages.find((p) => p.page_type === req.params.pageType);
  if (existingPage) {
    res.json({ ...existingPage, ...req.body, updatedDate: FIXED_TIMESTAMP });
  } else {
    // Create new page
    const newPage = {
      id: `page-${Date.now()}`,
      page_type: req.params.pageType,
      ...req.body,
      createdDate: FIXED_TIMESTAMP,
      updatedDate: FIXED_TIMESTAMP,
    };
    res.json(newPage);
  }
});

// DELETE /pages/:pageType - Delete page
app.delete('/pages/:pageType', (req: Request, res: Response) => {
  res.status(204).send();
});

// ============================================================================
// Projects
// ============================================================================

// Use shared sample projects from test-data.ts
const projects = [...sampleProjects];

// GET /projects - List projects with pagination
app.get('/projects', (req: Request, res: Response) => {
  const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10) || 20);
  const offset = Math.max(0, parseInt(req.query.offset as string || '0', 10) || 0);
  const featuredOnly = req.query.featured_only === 'true';

  let filteredProjects = projects.filter((p) => p.is_published);
  if (featuredOnly) {
    filteredProjects = filteredProjects.filter((p) => p.is_featured);
  }

  const pageProjects = filteredProjects.slice(offset, offset + limit);
  const projectCards = pageProjects.map(projectToCard);

  res.json({
    items: projectCards,
    total: filteredProjects.length,
    limit,
    offset,
  });
});

// GET /projects/slug/:slug - Get project by slug
app.get('/projects/slug/:slug', (req: Request, res: Response) => {
  const project = projects.find((p) => p.slug === req.params.slug && p.is_published);
  if (project) {
    res.json(project);
  } else {
    res.status(404).json({ detail: 'Project not found' });
  }
});

// GET /projects/:id - Get project by ID
app.get('/projects/:id', (req: Request, res: Response) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (project) {
    res.json(project);
  } else {
    res.status(404).json({ detail: 'Project not found' });
  }
});

// POST /projects - Create project (returns success but doesn't persist)
app.post('/projects', (req: Request, res: Response) => {
  const newProject = {
    id: `project-${Date.now()}`,
    slug: req.body.title?.toLowerCase().replace(/\s+/g, '-') || 'new-project',
    ...req.body,
    createdDate: FIXED_TIMESTAMP,
    updatedDate: FIXED_TIMESTAMP,
  };
  res.status(201).json(newProject);
});

// PUT /projects/:id - Update project (returns success but doesn't persist)
app.put('/projects/:id', (req: Request, res: Response) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (project) {
    res.json({ ...project, ...req.body, updatedDate: FIXED_TIMESTAMP });
  } else {
    res.status(404).json({ detail: 'Project not found' });
  }
});

// DELETE /projects/:id - Delete project
app.delete('/projects/:id', (req: Request, res: Response) => {
  res.status(204).send();
});

// ============================================================================
// Engagement (Reactions & Comments)
// ============================================================================

// GET /engagement/:targetType/:targetId/reactions - Get reactions for a target
app.get('/engagement/:targetType/:targetId/reactions', (req: Request, res: Response) => {
  res.json(sampleReactions);
});

// POST /engagement/:targetType/:targetId/reactions - Add/toggle reaction
app.post('/engagement/:targetType/:targetId/reactions', (req: Request, res: Response) => {
  res.json({
    added: true,
    reaction_tag: req.body.reaction_tag,
  });
});

// GET /engagement/:targetType/:targetId/comments - Get comments for a target
app.get('/engagement/:targetType/:targetId/comments', (req: Request, res: Response) => {
  res.json({ comments: sampleComments });
});

// POST /engagement/:targetType/:targetId/comments - Create a comment
app.post('/engagement/:targetType/:targetId/comments', (req: Request, res: Response) => {
  const newComment = createTestComment({
    content: req.body.content,
    parent_id: req.body.parent_id,
  });
  res.status(201).json(newComment);
});

// DELETE /engagement/comments/:commentId - Delete a comment
app.delete('/engagement/comments/:commentId', (req: Request, res: Response) => {
  res.status(204).send();
});

// POST /engagement/bulk/counts - Get bulk engagement counts
app.post('/engagement/bulk/counts', (req: Request, res: Response) => {
  const counts: Record<string, { reactions: Record<string, number>; comment_count: number }> = {};

  for (const target of req.body.targets) {
    const key = `${target.type}:${target.id}`;
    counts[key] = {
      reactions: sampleReactions.counts,
      comment_count: sampleComments.length,
    };
  }

  res.json({ counts });
});

// ============================================================================
// Sections
// ============================================================================

const sections = [...sampleSections];
const allSectionsList = [...allSections];

// GET /sections/resolve-path/:path(*) - Resolve path to section or content
app.get('/sections/resolve-path/{*path}', (req: Request, res: Response) => {
  const rawPath = req.params.path;
  const fullPath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
  if (!fullPath) {
    res.status(404).json({ detail: 'Path not found' });
    return;
  }

  // Try full path as section
  const section = allSectionsList.find((s) => s.path === fullPath && s.is_published);
  if (section) {
    // Build breadcrumbs by walking parents
    const breadcrumbs: Array<{ title: string; path: string }> = [];
    let current: typeof section | undefined = section;
    while (current) {
      breadcrumbs.unshift({ title: current.title, path: current.path });
      current = current.parent_id
        ? allSectionsList.find((s) => s.id === current!.parent_id) as typeof section | undefined
        : undefined;
    }
    res.json({ type: 'section', section, breadcrumbs });
    return;
  }

  // Try parent path as section, last segment as content slug
  const segments = fullPath.split('/');
  if (segments.length > 1) {
    const parentPath = segments.slice(0, -1).join('/');
    const itemSlug = segments[segments.length - 1];
    const parentSection = allSectionsList.find((s) => s.path === parentPath && s.is_published);

    if (parentSection) {
      // Check stories
      const story = sampleStories.find((s) => s.slug === itemSlug);
      if (story) {
        const breadcrumbs = [
          { title: parentSection.title, path: parentSection.path },
          { title: story.title, path: fullPath },
        ];
        res.json({ type: 'content', section: parentSection, content_item: { ...story, content_type: 'story' }, breadcrumbs });
        return;
      }

      // Check projects
      const project = sampleProjects.find((p) => p.slug === itemSlug && p.is_published);
      if (project) {
        const breadcrumbs = [
          { title: parentSection.title, path: parentSection.path },
          { title: project.title, path: fullPath },
        ];
        res.json({ type: 'content', section: parentSection, content_item: { ...project, content_type: 'project' }, breadcrumbs });
        return;
      }
    }
  }

  res.status(404).json({ detail: 'Path not found' });
});

// GET /sections/:id/children - Return child items for a section
app.get('/sections/:id/children', (req: Request, res: Response) => {
  const sectionId = req.params.id;
  const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10) || 20);
  const offset = Math.max(0, parseInt(req.query.offset as string || '0', 10) || 0);

  // Check if section exists
  const section = allSectionsList.find((s) => s.id === sectionId);
  if (!section) {
    res.status(404).json({ detail: 'Section not found' });
    return;
  }

  // Use pre-built children for blog section
  if (sectionId === TEST_SECTION_IDS.BLOG) {
    const paginated = sampleBlogChildren.slice(offset, offset + limit);
    res.json({ items: paginated, total: sampleBlogChildren.length, limit, offset });
    return;
  }

  // For other sections, return child sections + content items from stories/projects
  const childSections = allSectionsList
    .filter((s) => s.parent_id === sectionId && s.is_published)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      item_type: 'section' as const,
      content_type: s.content_type,
      title: s.title,
      path: s.path,
      display_type: s.display_type,
      tags: [] as string[],
      is_published: true,
      is_featured: false,
      sort_order: s.sort_order,
      created_at: s.createdDate,
      updated_at: s.updatedDate,
    }));

  // For sections with content, add content items
  const contentItems = sampleStories
    .filter(() => !section.content_type || section.content_type === 'story')
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      item_type: 'content' as const,
      content_type: 'story',
      title: s.title,
      tags: [] as string[],
      is_published: s.is_published,
      is_featured: false,
      created_at: s.createdDate,
      updated_at: s.updatedDate,
    }));

  const projectItems = sampleProjects
    .filter(() => !section.content_type || section.content_type === 'project')
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      item_type: 'content' as const,
      content_type: 'project',
      title: p.title,
      summary: p.summary,
      tags: p.technologies,
      is_published: p.is_published,
      is_featured: p.is_featured,
      sort_order: p.sort_order,
      created_at: p.createdDate,
      updated_at: p.updatedDate,
    }));

  const allItems = [...childSections, ...contentItems, ...projectItems];
  const paginated = allItems.slice(offset, offset + limit);
  res.json({ items: paginated, total: allItems.length, limit, offset });
});

// GET /sections - List sections with optional nav_visibility filter
app.get('/sections', (req: Request, res: Response) => {
  const navVisibility = req.query.nav_visibility as string | undefined;
  let filtered = sections.filter((s) => s.is_published);
  if (navVisibility) {
    filtered = filtered.filter((s) => s.nav_visibility === navVisibility);
  }
  res.json({
    items: filtered,
    total: filtered.length,
    limit: 20,
    offset: 0,
  });
});

// GET /sections/by-slug/:slug - Get section by slug
app.get('/sections/by-slug/:slug', (req: Request, res: Response) => {
  const section = sections.find((s) => s.slug === req.params.slug && s.is_published);
  if (section) {
    res.json(section);
  } else {
    res.status(404).json({ detail: 'Section not found' });
  }
});

// GET /sections/:id - Get section by ID
app.get('/sections/:id', (req: Request, res: Response) => {
  const section = sections.find((s) => s.id === req.params.id);
  if (section) {
    res.json(section);
  } else {
    res.status(404).json({ detail: 'Section not found' });
  }
});

// POST /sections - Create section (returns success but doesn't persist)
app.post('/sections', (req: Request, res: Response) => {
  const newSection = createTestSection({
    ...req.body,
    id: `section-${Date.now()}`,
    slug: req.body.title?.toLowerCase().replace(/\s+/g, '-') || 'new-section',
  });
  res.status(201).json(newSection);
});

// PUT /sections/:id - Update section (returns success but doesn't persist)
app.put('/sections/:id', (req: Request, res: Response) => {
  const section = sections.find((s) => s.id === req.params.id);
  if (section) {
    res.json({ ...section, ...req.body, updatedDate: FIXED_TIMESTAMP });
  } else {
    res.status(404).json({ detail: 'Section not found' });
  }
});

// DELETE /sections/:id - Delete section
app.delete('/sections/:id', (req: Request, res: Response) => {
  res.status(204).send();
});

// ============================================================================
// Photo Essays
// ============================================================================

// GET /photo-essays/section/:sectionId - List photo essays by section
app.get('/photo-essays/section/:sectionId', (req: Request, res: Response) => {
  res.json({
    items: samplePhotoEssayCards,
    total: samplePhotoEssayCards.length,
    limit: 20,
    offset: 0,
  });
});

// GET /photo-essays/:id - Get photo essay by ID
app.get('/photo-essays/:id', (req: Request, res: Response) => {
  if (req.params.id === samplePhotoEssayDetail.id) {
    res.json(samplePhotoEssayDetail);
  } else {
    res.status(404).json({ detail: 'Not found' });
  }
});

// Contact form submission
app.post('/contact', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Resume public endpoint
app.get('/resume/public', (req: Request, res: Response) => {
  res.json(sampleResume);
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Warmup endpoint (called by Next.js keep-alive service)
app.get('/warmup', (req: Request, res: Response) => {
  res.json({ status: 'warm', message: 'Mock server is ready' });
});

// Error handling middleware - prevents server crashes on unexpected errors
// In CI, we fail fast to surface issues immediately
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  console.error('[Mock API Error]', err);
  if (process.env.CI) {
    // Fail fast in CI to surface issues immediately
    throw err;
  }
  res.status(500).json({ detail: 'Mock server error' });
};
app.use(errorHandler);

const PORT = process.env.MOCK_SERVER_PORT || 5555;

app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
});
