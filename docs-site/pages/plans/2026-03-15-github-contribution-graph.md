# GitHub Contribution Graph Widget

## Goal

Add a GitHub-style contribution graph at the top of the projects section, showing private contribution data pulled from the GitHub API with server-side caching.

## Backend

### New endpoint: `GET /github/contributions`

**File**: `backend/routers/github.py`

- Queries GitHub GraphQL API with PAT (`GITHUB_TOKEN` env var)
- Query fetches `contributionsCollection.contributionCalendar` for user `ghostmonk`
- Returns: `totalContributions`, array of weeks containing `contributionDays` (date, count, level)
- Cache: store response in `github_cache` MongoDB collection with `fetched_at` timestamp
- Cache TTL: 1 hour — if cached data is fresh, return it without hitting GitHub
- No auth required on endpoint (public display data)
- Returns 503 if `GITHUB_TOKEN` not configured
- Register router in `backend/app.py`

### GraphQL Query

```graphql
query {
  user(login: "ghostmonk") {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}
```

`contributionLevel` values: `NONE`, `FIRST_QUARTILE`, `SECOND_QUARTILE`, `THIRD_QUARTILE`, `FOURTH_QUARTILE`.

## Frontend

### Component: `ContributionGraph`

**File**: `frontend/src/modules/projects/components/ContributionGraph.tsx`

**Layout**:
- Header: "{N} contributions in the last year" (left), profile link (right)
- Grid: 53 columns x 7 rows, each cell a colored square
- Month labels across top
- Day labels (Mon, Wed, Fri) on left side
- "Less / More" legend at bottom right with 5 color swatches
- Entire widget links to `https://github.com/ghostmonk`

**States**:
- Loading: shimmer/skeleton placeholder
- Error/no data: widget does not render
- Success: full graph

### Placement

In `[...slugPath].tsx`, between `<h1>` and `<SectionListView>`, conditionally rendered when `section.content_type === 'project'`.

### Styling

Color tokens in template CSS for 5 contribution levels, with dark mode variants matching GitHub's green scale. Component styles use template token system.

## Environment

- New env var: `GITHUB_TOKEN` (backend only, GitHub PAT with private contribution visibility)
- Add to `.env.example` documentation

## Implementation Steps

1. Create `backend/routers/github.py` with endpoint, GitHub GraphQL fetch, and MongoDB caching
2. Register router in `backend/app.py`
3. Add contribution level color tokens to template CSS (`tokens.css`)
4. Create `ContributionGraph` component with grid rendering and data fetching
5. Add component CSS to template `components.css`
6. Wire component into `[...slugPath].tsx` for project sections
7. Add `GITHUB_TOKEN` to `.env` and docker-compose
