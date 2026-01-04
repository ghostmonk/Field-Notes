import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Comment } from '@/shared/types/api';

interface CommentThreadProps {
  comment: Comment;
  onReply: (content: string, parentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentThread({ comment, onReply, onDelete }: CommentThreadProps) {
  const { data: session } = useSession();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = session?.user;
  const isOwner = user?.email && comment.user_id === user.email;

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      await onReply(replyContent, comment.id);
      setReplyContent('');
      setShowReplyInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    await onDelete(comment.id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="border-l-2 pl-4 py-2" style={{ borderColor: 'var(--color-border-primary)' }}>
      <div className="flex items-start gap-3">
        {comment.user_avatar ? (
          <Image
            src={comment.user_avatar}
            alt={comment.user_name}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            {comment.user_name[0]}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{comment.user_name}</span>
            <span className="text-gray-500 text-sm">{formatDate(comment.created_at)}</span>
          </div>

          <p className="mt-1" style={{ color: 'var(--color-text-primary)' }}>{comment.content}</p>

          <div className="mt-2 flex items-center gap-4 text-sm">
            {session && !comment.parent_id && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-gray-500 hover:text-gray-700"
              >
                Reply
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>

          {showReplyInput && (
            <div className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-2 rounded-lg resize-none"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: 'var(--color-border-primary)',
                  color: 'var(--color-text-primary)',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
                rows={2}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleReply}
                  disabled={isSubmitting || !replyContent.trim()}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Reply'}
                </button>
                <button
                  onClick={() => setShowReplyInput(false)}
                  className="px-3 py-1 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-3 ml-4">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
