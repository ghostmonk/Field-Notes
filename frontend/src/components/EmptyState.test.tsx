import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EmptyState } from './EmptyState';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe('EmptyState', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title and description', () => {
    render(<EmptyState title="No posts" description="Check back later" />);
    expect(screen.getByText('No posts')).toBeInTheDocument();
    expect(screen.getByText('Check back later')).toBeInTheDocument();
  });

  it('renders action link when provided', () => {
    render(
      <EmptyState title="Empty" action={{ label: 'Create', href: '/editor' }} />
    );
    expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/editor');
  });

  it('renders without action when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
