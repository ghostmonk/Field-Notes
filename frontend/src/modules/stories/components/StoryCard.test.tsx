import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StoryCard } from './StoryCard';
import { Story } from '@/shared/types/api';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('./LazyStoryContent', () => ({
  LazyStoryContent: ({ content }: any) => <div>{content}</div>,
}));

const baseStory = {
  id: '1',
  title: 'Test Story',
  content: '<p>Content</p>',
  slug: 'test-story',
  is_published: true,
  date: '2025-01-01',
  createdDate: '2025-01-01T00:00:00Z',
  updatedDate: '2025-01-01T00:00:00Z',
} as Story;

const baseProps = {
  session: null,
  onEdit: vi.fn(),
  onDelete: vi.fn().mockResolvedValue(undefined),
  deleteLoading: false,
};

afterEach(cleanup);

describe('StoryCard', () => {
  it('renders story title', () => {
    render(<StoryCard story={baseStory} {...baseProps} />);
    expect(screen.getByTestId('story-title-1')).toHaveTextContent('Test Story');
  });

  // -- Pattern: Navigation uses Next.js Link --
  it('title links via Next.js Link for SPA navigation', () => {
    render(<StoryCard story={baseStory} {...baseProps} />);
    const link = screen.getByTestId('story-title-link-1');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/stories/test-story');
  });

  // -- Pattern: Variant classes applied correctly --
  it('applies card--draft when story is unpublished', () => {
    const draft = { ...baseStory, is_published: false } as Story;
    render(<StoryCard story={draft} {...baseProps} />);
    const card = screen.getByTestId('story-card-1');
    expect(card.className).toContain('card--draft');
  });

  it('applies card--featured when featured prop is true', () => {
    render(<StoryCard story={baseStory} {...baseProps} featured />);
    const card = screen.getByTestId('story-card-1');
    expect(card.className).toContain('card--featured');
  });

  // -- Pattern: Multiple variant classes when multiple states active --
  // A story can be both a draft AND featured. Both classes must be present.
  it('applies both card--draft and card--featured when draft and featured', () => {
    const draft = { ...baseStory, is_published: false } as Story;
    render(<StoryCard story={draft} {...baseProps} featured />);
    const card = screen.getByTestId('story-card-1');
    expect(card.className).toContain('card--draft');
    expect(card.className).toContain('card--featured');
  });

  it('shows draft badge for unpublished stories', () => {
    const draft = { ...baseStory, is_published: false } as Story;
    render(<StoryCard story={draft} {...baseProps} />);
    expect(screen.getByTestId('story-draft-badge-1')).toHaveTextContent('DRAFT');
  });
});
