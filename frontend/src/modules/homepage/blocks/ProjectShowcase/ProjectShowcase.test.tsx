import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProjectShowcase } from './ProjectShowcase';
import type { HomepageData } from '../../types';
import type { ProjectCard } from '@/shared/types/api';

function makeProject(overrides: Partial<ProjectCard> = {}): ProjectCard {
    return {
        id: 'p1',
        title: 'Field Notes',
        slug: 'field-notes',
        summary: 'A self-hosted CMS',
        technologies: ['Next.js', 'FastAPI', 'MongoDB'],
        image_url: null,
        github_url: 'https://github.com/ghostmonk/field-notes',
        live_url: 'https://ghostmonk.com',
        is_featured: false,
        is_published: true,
        createdDate: '2026-01-01',
        updatedDate: '2026-10-20',
        ...overrides,
    };
}

const mockData: HomepageData = {
    stories: [],
    featuredStory: null,
    projects: [
        makeProject({ id: 'p1', title: 'Field Notes', slug: 'field-notes' }),
        makeProject({ id: 'p2', title: 'Financial Tracker', slug: 'financial-tracker', technologies: ['Tauri', 'Rust'] }),
    ],
    photoEssays: [],
    sectionPathMap: {},
};

afterEach(cleanup);

describe('ProjectShowcase', () => {
    it('renders nothing when no projects', () => {
        const { container } = render(
            <ProjectShowcase data={{ ...mockData, projects: [] }} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders project titles', () => {
        render(<ProjectShowcase data={mockData} />);
        expect(screen.getByText('Field Notes')).toBeInTheDocument();
        expect(screen.getByText('Financial Tracker')).toBeInTheDocument();
    });

    it('renders technology tags', () => {
        render(<ProjectShowcase data={mockData} />);
        expect(screen.getByText('Next.js')).toBeInTheDocument();
        expect(screen.getByText('Tauri')).toBeInTheDocument();
    });

    it('links to project detail page', () => {
        render(<ProjectShowcase data={mockData} />);
        const link = screen.getByTestId('project-card-p1');
        expect(link).toHaveAttribute('href', '/projects/field-notes');
    });

    it('shows section header with count', () => {
        render(<ProjectShowcase data={mockData} />);
        expect(screen.getByText('Projects')).toBeInTheDocument();
        expect(screen.getByText('2 active')).toBeInTheDocument();
    });
});
