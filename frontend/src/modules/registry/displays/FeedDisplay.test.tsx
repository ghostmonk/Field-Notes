import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FeedDisplay } from './FeedDisplay';

vi.mock('react-infinite-scroll-component', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="infinite-scroll">{children}</div>,
}));

vi.mock('react-spinners/ClipLoader', () => ({
  default: () => <div data-testid="spinner" />,
}));

afterEach(cleanup);

describe('FeedDisplay', () => {
  const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6'];

  it('renders items using renderItem', () => {
    render(
      <FeedDisplay
        items={items}
        renderItem={(item) => <div>{item}</div>}
        onLoadMore={vi.fn()}
        hasMore={false}
      />
    );
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 6')).toBeDefined();
  });

  it('shows back-to-top button when more than 5 items', () => {
    render(
      <FeedDisplay
        items={items}
        renderItem={(item) => <div>{item}</div>}
        onLoadMore={vi.fn()}
        hasMore={false}
      />
    );
    expect(screen.getByTestId('back-to-top')).toBeDefined();
  });

  it('does not show back-to-top button with 5 or fewer items', () => {
    render(
      <FeedDisplay
        items={['A', 'B', 'C']}
        renderItem={(item) => <div>{item}</div>}
        onLoadMore={vi.fn()}
        hasMore={false}
      />
    );
    expect(screen.queryByTestId('back-to-top')).toBeNull();
  });
});
