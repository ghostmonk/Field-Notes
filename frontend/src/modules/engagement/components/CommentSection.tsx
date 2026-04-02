import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Comment } from '@/shared/types/api';
import { CommentThread } from './CommentThread';
import { Button, Textarea } from '@/components/ui';
import { InlineError } from '@/components/ErrorDisplay';

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string, parentId?: string | null) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isLoading?: boolean;
  error?: Error | null;
}

export function CommentSection({
  comments,
  onAddComment,
  onDeleteComment,
  isLoading = false,
  error = null,
}: CommentSectionProps) {
  const { data: session } = useSession();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } catch {
      setSubmitError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (content: string, parentId: string) => {
    await onAddComment(content, parentId);
  };

  if (isLoading) {
    return <div className="py-4 text-gray-500">Loading comments...</div>;
  }

  // Count all comments including replies
  const totalComments = comments.reduce(
    (total, comment) => total + 1 + (comment.replies?.length || 0),
    0
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Comments {totalComments > 0 && `(${totalComments})`}
      </h3>

      <InlineError error={error ? "Failed to load comments. Please refresh the page." : null} />

      {/* New comment input */}
      {session ? (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
          />
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
          <InlineError error={submitError} />
        </div>
      ) : (
        <p className="text-gray-500">Sign in to leave a comment</p>
      )}

      {/* Comments list */}
      <div className="space-y-4 mt-6">
        {comments.length === 0 ? (
          <p className="text-gray-500">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onDelete={onDeleteComment}
            />
          ))
        )}
      </div>
    </div>
  );
}
