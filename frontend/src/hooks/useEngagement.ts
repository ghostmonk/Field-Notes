import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/api-client';
import { ReactionCounts, Comment, ReactionTag } from '@/types/api';
import { engagementConfig } from '@/config/engagement.config';

interface UseEngagementOptions {
  targetType: string;
  targetId: string;
  enableRealtime?: boolean;
}

interface UseEngagementReturn {
  reactions: ReactionCounts | null;
  comments: Comment[];
  isLoading: boolean;
  error: Error | null;
  toggleReaction: (tag: ReactionTag) => Promise<void>;
  addComment: (content: string, parentId?: string | null, mentions?: Array<{ user_id: string; user_name: string }>) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useEngagement({
  targetType,
  targetId,
  enableRealtime = true,
}: UseEngagementOptions): UseEngagementReturn {
  const { data: session } = useSession();
  const [reactions, setReactions] = useState<ReactionCounts | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const token = (session as { accessToken?: string })?.accessToken;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const config = engagementConfig.enabledTypes[targetType];
      if (!config) {
        setIsLoading(false);
        return;
      }

      const promises: Promise<void>[] = [];

      if (config.reactions) {
        promises.push(
          apiClient.engagement.getReactions(targetType, targetId, token).then((data) => {
            setReactions(data);
          })
        );
      }

      if (config.comments) {
        promises.push(
          apiClient.engagement.getComments(targetType, targetId).then((data) => {
            setComments(data.comments);
          })
        );
      }

      await Promise.all(promises);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch engagement data'));
    } finally {
      setIsLoading(false);
    }
  }, [targetType, targetId, token]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!enableRealtime || engagementConfig.realtime !== 'websocket') {
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/engagement/${targetType}/${targetId}/live`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.event === 'reaction_update') {
          fetchData(); // Refetch for simplicity
        } else if (message.event === 'comment_added' || message.event === 'comment_deleted') {
          fetchData();
        }
      };

      ws.onerror = () => {
        console.warn('WebSocket error, falling back to polling');
      };

      return () => {
        ws.close();
        wsRef.current = null;
      };
    } catch {
      console.warn('WebSocket not available');
    }
  }, [targetType, targetId, enableRealtime, fetchData]);

  const toggleReaction = useCallback(
    async (tag: ReactionTag) => {
      if (!token) {
        throw new Error('Must be logged in to react');
      }

      await apiClient.engagement.toggleReaction(targetType, targetId, { reaction_tag: tag }, token);
      await fetchData();
    },
    [targetType, targetId, token, fetchData]
  );

  const addComment = useCallback(
    async (content: string, parentId?: string | null, mentions: Array<{ user_id: string; user_name: string }> = []) => {
      if (!token) {
        throw new Error('Must be logged in to comment');
      }

      await apiClient.engagement.createComment(
        targetType,
        targetId,
        { content, parent_id: parentId ?? null, mentions },
        token
      );
      await fetchData();
    },
    [targetType, targetId, token, fetchData]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!token) {
        throw new Error('Must be logged in to delete comments');
      }

      await apiClient.engagement.deleteComment(commentId, token);
      await fetchData();
    },
    [token, fetchData]
  );

  return {
    reactions,
    comments,
    isLoading,
    error,
    toggleReaction,
    addComment,
    deleteComment,
    refresh: fetchData,
  };
}
