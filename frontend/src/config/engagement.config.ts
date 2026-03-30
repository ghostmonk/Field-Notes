/**
 * TEMPORARY: Engagement configuration
 *
 * TODO: Move to section configuration when dynamic section routing
 * is implemented. This file should be deleted and engagement settings
 * should be defined per-section in the section config system.
 */

export type RealtimeStrategy = 'websocket' | 'polling' | 'none';

export interface EngagementTypeConfig {
  reactions: boolean;
  comments: boolean;
}

export const engagementConfig = {
  /** Real-time update strategy */
  realtime: 'none' as RealtimeStrategy,

  /** Polling interval in ms (used if realtime is 'polling') */
  pollingInterval: 10000,

  /** Which content types have engagement enabled */
  enabledTypes: {
    story: { reactions: true, comments: true },
    project: { reactions: true, comments: false },
  } as Record<string, EngagementTypeConfig>,

  /** Available reaction tags (order matters for display) */
  reactionTags: ['thumbup', 'heart', 'surprise', 'celebrate', 'insightful'] as const,

  /** Emoji icons for each reaction tag */
  reactionIcons: {
    thumbup: '\uD83D\uDC4D',
    heart: '\u2764\uFE0F',
    surprise: '\uD83D\uDE2E',
    celebrate: '\uD83C\uDF89',
    insightful: '\uD83D\uDCA1',
  } as Record<string, string>,

  /** Human-readable labels for each reaction tag */
  reactionLabels: {
    thumbup: 'Thumbs up',
    heart: 'Heart',
    surprise: 'Surprise',
    celebrate: 'Celebrate',
    insightful: 'Insightful',
  } as Record<string, string>,
};

export type ReactionTag = (typeof engagementConfig.reactionTags)[number];
