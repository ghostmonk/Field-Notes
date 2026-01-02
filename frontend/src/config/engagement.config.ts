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
  realtime: 'websocket' as RealtimeStrategy,

  /** Polling interval in ms (used if realtime is 'polling') */
  pollingInterval: 10000,

  /** Which content types have engagement enabled */
  enabledTypes: {
    story: { reactions: true, comments: true },
    project: { reactions: true, comments: false },
  } as Record<string, EngagementTypeConfig>,

  /** Available reaction tags (order matters for display) */
  reactionTags: ['thumbup', 'heart', 'surprise', 'celebrate', 'insightful'] as const,
};

export type ReactionTag = (typeof engagementConfig.reactionTags)[number];
