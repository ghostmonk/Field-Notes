import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe('Breadcrumbs', () => {
  it('renders section link and current item', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Blog', href: '/blog' },
          { label: 'My Post' },
        ]}
      />
    );
    const link = screen.getByRole('link', { name: 'Blog' });
    expect(link).toHaveAttribute('href', '/blog');
    expect(screen.getByText('My Post')).toBeInTheDocument();
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
  });

  it('does not render link on last item', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Blog', href: '/blog' },
          { label: 'Current' },
        ]}
      />
    );
    expect(screen.queryByRole('link', { name: 'Current' })).not.toBeInTheDocument();
  });

  it('marks last item with aria-current page', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Blog', href: '/blog' },
          { label: 'Post' },
        ]}
      />
    );
    expect(screen.getByText('Post')).toHaveAttribute('aria-current', 'page');
  });
});
