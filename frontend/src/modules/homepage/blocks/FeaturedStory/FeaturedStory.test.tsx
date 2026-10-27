import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FeaturedStory } from './FeaturedStory';
import type { HomepageData } from '../../types';
import type { Story } from '@/shared/types/api';

const mockStory: Story = {
    id: 's1',
    title: 'Building a CMS',
    content: 'This is a test story with enough words to estimate reading time accurately for the component.',
    is_published: true,
    slug: 'building-a-cms',
    date: '2026-10-20',
    createdDate: '2026-10-20',
    updatedDate: '2026-10-20',
    tags: ['engineering', 'nextjs', 'typescript'],
    section_id: 'sec1',
};

const mockData: HomepageData = {
    stories: [],
    featuredStory: mockStory,
    projects: [],
    photoEssays: [],
    sectionPathMap: { sec1: 'writing' },
};

afterEach(cleanup);

describe('FeaturedStory', () => {
    it('renders nothing when no featured story', () => {
        const { container } = render(
            <FeaturedStory data={{ ...mockData, featuredStory: null }} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders the featured story title', () => {
        render(<FeaturedStory data={mockData} />);
        expect(screen.getByText('Building a CMS')).toBeInTheDocument();
    });

    it('renders section header', () => {
        render(<FeaturedStory data={mockData} />);
        expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('links to the correct section path', () => {
        render(<FeaturedStory data={mockData} />);
        const link = screen.getByTestId('featured-story-link');
        expect(link).toHaveAttribute('href', '/writing/building-a-cms');
    });

    it('renders tags', () => {
        render(<FeaturedStory data={mockData} />);
        expect(screen.getByText('engineering')).toBeInTheDocument();
        expect(screen.getByText('nextjs')).toBeInTheDocument();
    });

    it('limits tags to 3', () => {
        const storyWith5Tags = {
            ...mockStory,
            tags: ['a', 'b', 'c', 'd', 'e'],
        };
        render(
            <FeaturedStory data={{ ...mockData, featuredStory: storyWith5Tags }} />
        );
        expect(screen.getByText('a')).toBeInTheDocument();
        expect(screen.getByText('c')).toBeInTheDocument();
        expect(screen.queryByText('d')).not.toBeInTheDocument();
    });

    it('shows read time estimate', () => {
        render(<FeaturedStory data={mockData} />);
        expect(screen.getByText(/min read/)).toBeInTheDocument();
    });
});
