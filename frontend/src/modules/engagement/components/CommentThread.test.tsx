import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CommentThread } from './CommentThread';
import { Comment } from '@/shared/types/api';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Test', email: 'test@test.com', role: 'admin' } },
    status: 'authenticated',
  }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock('@/components/ConfirmDialog', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

afterEach(cleanup);

const mockComment: Comment = {
  id: 'c1',
  content: 'Test comment',
  user_name: 'John',
  user_id: 'john@test.com',
  user_avatar: null,
  target_type: 'story',
  target_id: 's1',
  parent_id: null,
  mentions: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  deleted_at: null,
  replies: [],
};

describe('CommentThread', () => {
  const defaultProps = {
    comment: mockComment,
    onReply: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
  };

  it('renders comment content and author name', () => {
    render(<CommentThread {...defaultProps} />);
    expect(screen.getByText('Test comment')).toBeDefined();
    expect(screen.getByText('John')).toBeDefined();
  });

  it('shows reply button for authenticated users', () => {
    render(<CommentThread {...defaultProps} />);
    expect(screen.getByText('Reply')).toBeDefined();
  });

  it('shows delete button when user is the comment owner', () => {
    const ownedComment = { ...mockComment, user_id: 'test@test.com' };
    render(<CommentThread {...defaultProps} comment={ownedComment} />);
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('does not show delete button when user is not the owner', () => {
    render(<CommentThread {...defaultProps} />);
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('shows reply input when reply button is clicked', () => {
    render(<CommentThread {...defaultProps} />);
    fireEvent.click(screen.getByText('Reply'));
    expect(screen.getByPlaceholderText('Write a reply...')).toBeDefined();
  });

  it('renders user avatar when provided', () => {
    const commentWithAvatar = { ...mockComment, user_avatar: 'https://example.com/avatar.jpg' };
    render(<CommentThread {...defaultProps} comment={commentWithAvatar} />);
    expect(screen.getByAltText('John')).toBeDefined();
  });
});
