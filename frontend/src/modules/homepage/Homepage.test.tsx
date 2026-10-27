import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Homepage } from './Homepage';
import type { HomepageBlockConfig, HomepageData } from './types';

vi.mock('./blockRegistry', () => ({
    blockRegistry: {
        'identity-hero': () => <div data-testid="block-hero">hero</div>,
        'recent-writing': () => <div data-testid="block-writing">writing</div>,
        'contribution-graph': () => <div data-testid="block-github">github</div>,
    },
}));

const mockData: HomepageData = {
    stories: [],
    featuredStory: null,
    projects: [],
    photoEssays: [],
    sectionPathMap: {},
};

afterEach(cleanup);

describe('Homepage', () => {
    it('renders blocks in order', () => {
        const blocks: HomepageBlockConfig[] = [
            { type: 'identity-hero', id: 'hero' },
            { type: 'recent-writing', id: 'writing' },
            { type: 'contribution-graph', id: 'github' },
        ];
        render(<Homepage blocks={blocks} data={mockData} />);

        const homepage = screen.getByTestId('homepage');
        const children = homepage.children;
        expect(children[0]).toHaveAttribute('data-testid', 'block-hero');
        expect(children[1]).toHaveAttribute('data-testid', 'block-writing');
        expect(children[2]).toHaveAttribute('data-testid', 'block-github');
    });

    it('skips unknown block types', () => {
        const blocks: HomepageBlockConfig[] = [
            { type: 'identity-hero', id: 'hero' },
            { type: 'photo-strip' as any, id: 'photos' },
        ];
        render(<Homepage blocks={blocks} data={mockData} />);

        const homepage = screen.getByTestId('homepage');
        expect(homepage.children).toHaveLength(1);
    });

    it('renders empty homepage with no blocks', () => {
        render(<Homepage blocks={[]} data={mockData} />);
        const homepage = screen.getByTestId('homepage');
        expect(homepage.children).toHaveLength(0);
    });
});
