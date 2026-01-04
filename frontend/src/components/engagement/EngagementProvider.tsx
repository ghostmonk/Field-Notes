import { createContext, useContext, ReactNode } from 'react';
import { useEngagement } from '@/hooks/useEngagement';
import { ReactionCounts, Comment, ReactionTag, Mention } from '@/shared/types/api';

interface EngagementContextValue {
  targetType: string;
  targetId: string;
  reactions: ReactionCounts | null;
  comments: Comment[];
  isLoading: boolean;
  error: Error | null;
  toggleReaction: (tag: ReactionTag) => Promise<void>;
  addComment: (content: string, parentId?: string | null, mentions?: Mention[]) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EngagementContext = createContext<EngagementContextValue | null>(null);

interface EngagementProviderProps {
  targetType: string;
  targetId: string;
  children: ReactNode;
}

export function EngagementProvider({ targetType, targetId, children }: EngagementProviderProps) {
  const engagement = useEngagement({ targetType, targetId });

  return (
    <EngagementContext.Provider value={{ targetType, targetId, ...engagement }}>
      {children}
    </EngagementContext.Provider>
  );
}

export function useEngagementContext() {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error('useEngagementContext must be used within an EngagementProvider');
  }
  return context;
}
