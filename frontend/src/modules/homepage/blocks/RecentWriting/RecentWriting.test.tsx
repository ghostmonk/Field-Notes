import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RecentWriting } from './RecentWriting';
import type { HomepageData } from '../../types';
import type { Story } from '@/shared/types/api';

function makeStory(overrides: Partial<Story> = {}): Story {
    return {
        id: 's1',
        title: 'Test Story',
        content: 'Content',
        is_published: true,
        slug: 'test-story',
        date: '2026-10-20',
        createdDate: '2026-10-20',
        updatedDate: '2026-10-20',
        tags: [],
        section_id: 'sec1',
        ...overrides,
    };
}

const mockData: HomepageData = {
    stories: [
        makeStory({ id: 's1', title: 'First Post', slug: 'first-post' }),
        makeStory({ id: 's2', title: 'Second Post', slug: 'second-post' }),
    ],
    featuredStory: null,
    projects: [],
    photoEssays: [],
    sectionPathMap: { sec1: 'writing' },
};

afterEach(cleanup);

describe('RecentWriting', () => {
    it('renders nothing when no stories', () => {
        const { container } = render(
            <RecentWriting data={{ ...mockData, stories: [] }} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders story titles as links', () => {
        render(<RecentWriting data={mockData} />);
        expect(screen.getByText('First Post')).toBeInTheDocument();
        expect(screen.getByText('Second Post')).toBeInTheDocument();
    });

    it('links to section-based paths', () => {
        render(<RecentWriting data={mockData} />);
        const link = screen.getByTestId('recent-story-s1');
        expect(link).toHaveAttribute('href', '/writing/first-post');
    });

    it('shows section header with count', () => {
        render(<RecentWriting data={mockData} />);
        expect(screen.getByText('Recent Writing')).toBeInTheDocument();
        expect(screen.getByText('2 latest')).toBeInTheDocument();
    });

    it('falls back to /stories path when no section mapping', () => {
        render(
            <RecentWriting data={{ ...mockData, sectionPathMap: {} }} />
        );
        const link = screen.getByTestId('recent-story-s1');
        expect(link).toHaveAttribute('href', '/stories/first-post');
    });
});
