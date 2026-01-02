# ADR 0004: Engagement System (Reactions & Comments)

## Status
Proposed

## Context
Stories and other content types lack user engagement features. Users cannot react to or comment on content, limiting the social and interactive aspects of the platform. The system needs:

1. Reactions (multiple types like thumbup, heart, etc.) on content
2. Comments with single-level replies and @mentions
3. Visibility into who reacted (on hover/tooltip)
4. Real-time updates when new reactions/comments appear
5. A reusable architecture that can attach to any content type (Stories, Projects, etc.)
6. Configurability for different deployment scenarios

## Decision
We will implement a generic Engagement system with the following architecture:

### Data Models

**Reactions Collection**
```
reactions
├── _id
├── target_type      # "story" | "project" | etc.
├── target_id        # ObjectId of the content
├── user_id          # ObjectId of the user
├── user_name        # Denormalized for hover/tooltip display
├── reaction_tag     # "thumbup" | "heart" | "surprise" | "celebrate" | "insightful"
├── created_at
└── (unique index on target_type + target_id + user_id + reaction_tag)
```

The `reaction_tag` is a semantic identifier. The backend stores meaning; the frontend decides how to display each tag (icon, color, animation).

**Comments Collection**
```
comments
├── _id
├── target_type      # "story" | "project" | etc.
├── target_id        # ObjectId of the content
├── parent_id        # null for top-level, comment _id for replies
├── user_id
├── user_name        # Denormalized
├── user_avatar      # Denormalized
├── content          # The comment text
├── mentions         # [{ user_id, user_name }] for @mentions
├── created_at
├── updated_at
├── deleted_at       # Soft delete for future moderation
```

The `target_type` + `target_id` pattern enables attaching engagement to any content type without schema changes.

### API Design

**Reactions Endpoints**
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/engagement/{target_type}/{target_id}/reactions` | GET | No | Get reactions with counts, details, user's reactions |
| `/api/engagement/{target_type}/{target_id}/reactions` | POST | Yes | Toggle reaction (add/remove) |
| `/api/engagement/bulk/counts` | POST | No | Get counts for multiple targets (feed) |

**Comments Endpoints**
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/engagement/{target_type}/{target_id}/comments` | GET | No | Get comments with nested replies |
| `/api/engagement/{target_type}/{target_id}/comments` | POST | Yes | Create comment or reply |
| `/api/engagement/comments/{comment_id}` | DELETE | Yes | Soft delete (own comments only) |

**Authentication Rules**
- GET endpoints are public (unauthenticated users can read)
- POST/DELETE require authentication via existing Google OAuth
- `user_reactions` field only returned for authenticated users

### Real-Time Updates

**Primary: WebSockets**
```
WS /api/engagement/{target_type}/{target_id}/live

# Server broadcasts events:
{ "event": "reaction_update", "payload": {...} }
{ "event": "comment_added", "payload": {...} }
{ "event": "comment_deleted", "payload": {...} }
```

**Configurable Strategy**
```python
# Backend config
REALTIME_STRATEGY = "websocket"  # or "polling" or "none"
POLLING_INTERVAL_HINT = 10  # seconds
```

Sites with high traffic can switch to polling without code changes. The frontend detects the configured strategy and adapts.

**Fallback Endpoint (for polling mode)**
```
GET /api/engagement/{target_type}/{target_id}/updates?since={timestamp}
```

### Frontend Components

```
components/engagement/
├── EngagementProvider.tsx    # Context for real-time connection
├── ReactionBar.tsx           # Displays reaction buttons + counts
├── ReactionPicker.tsx        # Popup to choose reaction type
├── ReactionTooltip.tsx       # Shows who reacted on hover
├── CommentSection.tsx        # Full comment list + input
├── CommentThread.tsx         # Single comment with replies
├── CommentInput.tsx          # Text input with @mention support
├── MentionSuggestions.tsx    # Dropdown for @mention autocomplete
└── config.ts                 # Reaction tag display mapping
```

**Usage Examples**
```tsx
// Story page (full engagement)
<EngagementProvider targetType="story" targetId={story.id}>
  <ReactionBar />
  <CommentSection />
</EngagementProvider>

// Feed (reactions only, compact)
<ReactionBar targetType="story" targetId={story.id} compact />
```

### Developer Configuration

**TEMPORARY**: This configuration will move to section configuration when dynamic section routing is implemented.

```typescript
// frontend/src/config/engagement.config.ts

/**
 * TEMPORARY: Engagement configuration
 *
 * TODO: Move to section configuration when dynamic section routing
 * is implemented. This file should be deleted and engagement settings
 * should be defined per-section in the section config system.
 */
export const engagementConfig = {
  realtime: "websocket" as "websocket" | "polling" | "none",
  pollingInterval: 10000,

  enabledTypes: {
    story: { reactions: true, comments: true },
    project: { reactions: true, comments: false },
  },

  reactionTags: ["thumbup", "heart", "surprise", "celebrate", "insightful"],
};
```

```python
# backend/config/engagement.py

"""
TEMPORARY: Engagement configuration

TODO: Move to section configuration when dynamic section routing
is implemented. This file should be deleted and engagement settings
should be defined per-section in the section config system.
"""

ENGAGEMENT_ENABLED_TYPES = {
    "story": {"reactions": True, "comments": True},
    "project": {"reactions": True, "comments": False},
}

ALLOWED_REACTION_TAGS = ["thumbup", "heart", "surprise", "celebrate", "insightful"]

REALTIME_STRATEGY = "websocket"  # or "polling" or "none"
```

Backend validates against config and rejects requests for disabled content types or unknown reaction tags.

### Error Handling

**Error Response Format**
```json
{
  "error": "comment_not_found",
  "message": "Human readable description"
}
```

**HTTP Status Codes**
- 401 - Not authenticated (write operations)
- 403 - Not authorized (e.g., deleting another user's comment)
- 404 - Target or comment not found
- 422 - Invalid input (unknown reaction_tag, disabled content type)

### Future Extensibility

**Permission System (designed for, not implemented)**
```python
class EngagementPermissions:
    def can_delete_comment(user, comment, target) -> bool:
        # Currently: only own comments
        # Future: author moderation, admin roles

    def can_moderate(user, target) -> bool:
        # Future: disable comments, hide reactions
```

Current implementation allows users to delete only their own comments. The permission structure supports adding author moderation or admin roles via config changes, not rewrites.

## Consequences

### Positive
- Generic system attaches to any content type via `target_type` + `target_id`
- Adding new content types requires only config changes, no schema updates
- Real-time strategy is configurable for different deployment scenarios
- Semantic reaction tags decouple backend meaning from frontend presentation
- Soft delete enables future moderation and audit trails
- Single-level replies with @mentions balance conversation without complexity
- Public read access enables engagement visibility for non-authenticated visitors

### Negative
- WebSocket connections consume resources with many concurrent viewers
- Denormalized user data (name, avatar) requires updates if users change profiles
- No author moderation initially (by design, but limits author control)
- No notifications initially (users must check for new engagement manually)
- Configuration lives in two places until section routing is implemented

## Implementation Notes

### Backend Files to Create
- `config/engagement.py` - Configuration
- `models/reaction.py` - Pydantic models for reactions
- `models/comment.py` - Pydantic models for comments
- `handlers/engagement.py` - API endpoints
- `services/engagement_ws.py` - WebSocket manager

### Frontend Files to Create
- `config/engagement.config.ts` - Configuration
- `components/engagement/` - All engagement components
- `hooks/useEngagement.ts` - Data fetching and real-time hooks
- `pages/api/engagement/` - Next.js API proxies

### Database Indexes
```javascript
// reactions
db.reactions.createIndex({ target_type: 1, target_id: 1 })
db.reactions.createIndex({ target_type: 1, target_id: 1, user_id: 1, reaction_tag: 1 }, { unique: true })

// comments
db.comments.createIndex({ target_type: 1, target_id: 1 })
db.comments.createIndex({ parent_id: 1 })
```

## Future Considerations
- Author moderation (delete comments, disable engagement on own content)
- Admin moderation panel
- Notifications (in-app and/or email)
- Reaction analytics and trending content
- Rate limiting for spam prevention
- Content type validation against actual documents
- Migration to section configuration system
