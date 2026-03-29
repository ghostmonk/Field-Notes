import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProjectDetail } from './ProjectDetail';
import { Project } from '@/shared/types/api';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));
vi.mock('isomorphic-dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

const mockProject = {
  id: '1',
  title: 'Test Project',
  slug: 'test-project',
  summary: 'A summary',
  content: '<p>Content</p>',
  technologies: ['React'],
  is_published: true,
  is_featured: true,
  sort_order: 0,
  image_url: '/test.jpg',
  github_url: 'https://github.com/test',
  live_url: 'https://test.com',
  createdDate: '2025-01-01',
  updatedDate: '2025-01-01',
} as Project;

afterEach(cleanup);

describe('ProjectDetail', () => {
  it('renders project title', () => {
    render(<ProjectDetail project={mockProject} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('shows featured badge', () => {
    render(<ProjectDetail project={mockProject} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('renders technology tags', () => {
    render(<ProjectDetail project={mockProject} />);
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('shows GitHub and Live Demo links', () => {
    render(<ProjectDetail project={mockProject} />);
    const githubLink = screen.getByText('View on GitHub');
    const liveLink = screen.getByText('Live Demo');
    expect(githubLink.closest('a')).toHaveAttribute('href', 'https://github.com/test');
    expect(liveLink.closest('a')).toHaveAttribute('href', 'https://test.com');
  });

  it('renders content in Card', () => {
    render(<ProjectDetail project={mockProject} />);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
