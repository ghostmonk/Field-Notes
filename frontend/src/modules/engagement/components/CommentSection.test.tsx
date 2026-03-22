import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CommentSection } from './CommentSection';
import { Comment } from '@/shared/types/api';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Test', email: 'test@test.com', role: 'admin' } },
    status: 'authenticated',
  }),
}));

vi.mock('./CommentThread', () => ({
  CommentThread: ({ comment }: any) => (
    <div data-testid={`comment-${comment.id}`}>{comment.content}</div>
  ),
}));

afterEach(cleanup);

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'c1',
  target_type: 'story',
  target_id: 's1',
  parent_id: null,
  user_id: 'user1',
  user_name: 'John',
  user_avatar: null,
  content: 'Test comment',
  mentions: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  deleted_at: null,
  replies: [],
  ...overrides,
});

describe('CommentSection', () => {
  const defaultProps = {
    comments: [makeComment(), makeComment({ id: 'c2', content: 'Second comment' })],
    onAddComment: vi.fn().mockResolvedValue(undefined),
    onDeleteComment: vi.fn().mockResolvedValue(undefined),
  };

  it('renders comment list', () => {
    render(<CommentSection {...defaultProps} />);
    expect(screen.getByTestId('comment-c1')).toBeDefined();
    expect(screen.getByTestId('comment-c2')).toBeDefined();
  });

  it('shows textarea for new comment when authenticated', () => {
    render(<CommentSection {...defaultProps} />);
    expect(screen.getByPlaceholderText('Write a comment...')).toBeDefined();
  });

  it('shows submit button', () => {
    render(<CommentSection {...defaultProps} />);
    expect(screen.getByText('Post Comment')).toBeDefined();
  });

  it('shows "No comments yet" when empty', () => {
    render(<CommentSection {...defaultProps} comments={[]} />);
    expect(screen.getByText(/No comments yet/)).toBeDefined();
  });

  it('shows comment count in heading', () => {
    render(<CommentSection {...defaultProps} />);
    expect(screen.getByText('Comments (2)')).toBeDefined();
  });

  it('shows loading state', () => {
    render(<CommentSection {...defaultProps} isLoading />);
    expect(screen.getByText('Loading comments...')).toBeDefined();
  });
});
