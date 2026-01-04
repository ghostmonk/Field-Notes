import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ReactionCounts, ReactionTag } from '@/shared/types/api';
import { engagementConfig } from '@/config/engagement.config';

interface ReactionBarProps {
  reactions: ReactionCounts | null;
  onToggle: (tag: ReactionTag) => Promise<void>;
  compact?: boolean;
}

const REACTION_ICONS: Record<string, string> = {
  thumbup: '\uD83D\uDC4D',
  heart: '\u2764\uFE0F',
  surprise: '\uD83D\uDE2E',
  celebrate: '\uD83C\uDF89',
  insightful: '\uD83D\uDCA1',
};

export function ReactionBar({ reactions, onToggle, compact = false }: ReactionBarProps) {
  const { data: session } = useSession();
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (tag: ReactionTag) => {
    if (!session) return;
    setIsLoading(true);
    try {
      await onToggle(tag);
    } finally {
      setIsLoading(false);
      setShowPicker(false);
    }
  };

  const userReactions = reactions?.user_reactions || [];
  const counts = reactions?.counts || {};

  // In compact mode, show only counts
  if (compact) {
    const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {totalReactions > 0 && (
          <span className="flex items-center gap-1">
            {Object.entries(counts)
              .slice(0, 3)
              .map(([tag]) => (
                <span key={tag}>{REACTION_ICONS[tag]}</span>
              ))}
            <span>{totalReactions}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1 md:gap-2">
      {/* Show existing reactions with counts */}
      {Object.entries(counts).map(([tag, count]) => (
        <button
          key={tag}
          onClick={() => handleToggle(tag as ReactionTag)}
          disabled={isLoading || !session}
          className={`flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-1 rounded-full text-sm transition-colors ${
            userReactions.includes(tag)
              ? 'ring-2 ring-blue-500'
              : 'hover:opacity-75'
          }`}
          style={{ color: 'var(--color-text-secondary)' }}
          title={
            reactions?.details[tag]
              ?.map((u) => u.user_name)
              .join(', ') || ''
          }
        >
          <span>{REACTION_ICONS[tag]}</span>
          <span>{count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      {session && (
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="px-2 py-1 rounded-full text-sm hover:opacity-75"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            +
          </button>

          {showPicker && (
            <div
              className="absolute bottom-full left-0 mb-2 p-2 rounded-lg shadow-lg flex gap-1"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border-primary)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              {engagementConfig.reactionTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleToggle(tag)}
                  disabled={isLoading}
                  className="p-2 hover:opacity-75 rounded"
                >
                  {REACTION_ICONS[tag]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
