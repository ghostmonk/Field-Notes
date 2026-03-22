import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

const mockProject = {
  id: '1',
  title: 'Test Project',
  slug: 'test-project',
  summary: 'A test project',
  technologies: ['React', 'Node'],
  is_featured: false,
  image_url: '',
  github_url: '',
  live_url: '',
};

afterEach(cleanup);

describe('ProjectCard', () => {
  it('renders project title', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('renders technologies as tags', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node')).toBeInTheDocument();
  });

  it('shows featured badge when is_featured is true', () => {
    render(<ProjectCard project={{ ...mockProject, is_featured: true }} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('links to correct project URL', () => {
    render(<ProjectCard project={mockProject} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/test-project');
  });

  it('uses custom basePath when provided', () => {
    render(<ProjectCard project={mockProject} basePath="/work" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/work/test-project');
  });

  // -- Pattern: Navigation uses Next.js Link --
  // The next/link mock renders <a>. If the component bypasses Link (e.g. raw
  // <a> or Card as="a"), it still renders an anchor but loses SPA transitions
  // and prefetching. This test verifies the mock is wired up — if someone
  // removes the Link import, the mock stops matching and the test breaks.
  it('wraps card in a navigable link', () => {
    render(<ProjectCard project={mockProject} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/test-project');
    // card--link class provides text-decoration:none on the Link wrapper
    expect(link.className).toContain('card--link');
  });
});
