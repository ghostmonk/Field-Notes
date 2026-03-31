import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { StoryDetail } from './StoryDetail';
import { Story } from '@/shared/types/api';

vi.mock('./LazyStoryContent', () => ({
  LazyStoryContent: ({ content, ...props }: any) => <div data-testid="story-content" {...props}>{content}</div>,
}));
vi.mock('@/components/ReadingProgressBar', () => ({
  ReadingProgressBar: () => null,
}));
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null })),
}));

const mockStory = {
  id: '1',
  title: 'Test Story',
  content: '<p>Hello</p>',
  slug: 'test-story',
  is_published: true,
  date: '2025-01-01',
  createdDate: '2025-01-01T00:00:00Z',
  updatedDate: '2025-01-01T00:00:00Z',
} as Story;

afterEach(() => {
  vi.mocked(useSession).mockReturnValue({ data: null } as any);
  cleanup();
});

describe('StoryDetail', () => {
  it('renders story title', () => {
    render(<StoryDetail story={mockStory} />);
    expect(screen.getByTestId('story-page-title')).toHaveTextContent('Test Story');
  });

  it('shows edit button when onEdit provided and user is admin', () => {
    vi.mocked(useSession).mockReturnValue({ data: { user: { role: 'admin' } } } as any);
    const onEdit = vi.fn();
    render(<StoryDetail story={mockStory} onEdit={onEdit} />);
    const btn = screen.getByTestId('story-edit-button');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('hides edit button when onEdit not provided', () => {
    render(<StoryDetail story={mockStory} />);
    expect(screen.queryByTestId('story-edit-button')).not.toBeInTheDocument();
  });

  it('renders children when passed', () => {
    render(
      <StoryDetail story={mockStory}>
        <div data-testid="child">Child content</div>
      </StoryDetail>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Child content');
  });

  // -- Pattern: Semantic HTML element --
  // StoryDetail must render as <article>, not <div>. Screen readers and
  // structured-data parsers use this landmark for content navigation.
  it('renders as <article> for semantic HTML', () => {
    render(<StoryDetail story={mockStory} />);
    const el = screen.getByTestId('story-article');
    expect(el.tagName).toBe('ARTICLE');
  });
});
