import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Comment } from '@/types/api';
import { CommentThread } from './CommentThread';

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string, parentId?: string | null) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isLoading?: boolean;
}

export function CommentSection({
  comments,
  onAddComment,
  onDeleteComment,
  isLoading = false,
}: CommentSectionProps) {
  const { data: session } = useSession();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* New comment input */}
      {session ? (
        <div className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
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
