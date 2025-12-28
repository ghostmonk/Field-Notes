import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { sampleStories, FIXED_TIMESTAMP } from './test-data';

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
