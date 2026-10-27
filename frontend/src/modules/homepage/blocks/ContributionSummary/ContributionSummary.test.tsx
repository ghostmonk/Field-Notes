import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ContributionSummary } from './ContributionSummary';
import type { HomepageData } from '../../types';

vi.mock('@/modules/projects', () => ({
    ContributionGraph: () => <div data-testid="contribution-graph-mock">Graph</div>,
    LanguageBreakdown: () => <div data-testid="language-breakdown-mock">Languages</div>,
}));

const mockData: HomepageData = {
    stories: [],
    featuredStory: null,
    projects: [],
    photoEssays: [],
    sectionPathMap: {},
};

afterEach(cleanup);

describe('ContributionSummary', () => {
    it('renders section header', () => {
        render(<ContributionSummary data={mockData} />);
        expect(screen.getByText('GitHub')).toBeInTheDocument();
    });

    it('renders contribution graph', () => {
        render(<ContributionSummary data={mockData} />);
        expect(screen.getByTestId('contribution-graph-mock')).toBeInTheDocument();
    });

    it('has correct testid', () => {
        render(<ContributionSummary data={mockData} />);
        expect(screen.getByTestId('contribution-summary-block')).toBeInTheDocument();
    });
});
