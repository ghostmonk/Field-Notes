import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const mockContributionData = {
    totalContributions: 1234,
    weeks: [
        { contributionDays: [
            { date: '2026-01-01', contributionCount: 5, contributionLevel: 'SECOND_QUARTILE' },
            { date: '2026-01-02', contributionCount: 3, contributionLevel: 'FIRST_QUARTILE' },
            { date: '2026-01-03', contributionCount: 1, contributionLevel: 'FIRST_QUARTILE' },
        ] },
        { contributionDays: [
            { date: '2026-01-04', contributionCount: 0, contributionLevel: 'NONE' },
            { date: '2026-01-05', contributionCount: 7, contributionLevel: 'THIRD_QUARTILE' },
            { date: '2026-01-06', contributionCount: 2, contributionLevel: 'FIRST_QUARTILE' },
        ] },
    ],
};

vi.mock('../hooks/useGitHubContributions', () => ({
    useGitHubContributions: vi.fn(() => ({ data: mockContributionData, error: false })),
}));

vi.mock('@/config', () => ({
    getSiteConfig: () => ({
        site: { title: 'Test', tagline: 'Test site', author: 'Test', copyright: '' },
        github: { username: 'testuser', url: 'https://github.com/testuser' },
    }),
}));

import { LanguageBreakdown } from './LanguageBreakdown';
import { useGitHubContributions } from '../hooks/useGitHubContributions';

const mockLanguages = [
    { name: 'TypeScript', color: '#3178c6', percentage: 40 },
    { name: 'Python', color: '#a8d08d', percentage: 25 },
    { name: 'Rust', color: '#dea584', percentage: 15 },
    { name: 'Go', color: '#00add8', percentage: 10 },
    { name: 'CSS', color: '#563d7c', percentage: 5 },
    { name: 'HTML', color: '#e34c26', percentage: 3 },
    { name: 'Shell', color: '#89e051', percentage: 2 },
];

afterEach(cleanup);

beforeEach(() => {
    vi.mocked(useGitHubContributions).mockReturnValue({ data: mockContributionData, error: false });
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLanguages),
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('LanguageBreakdown', () => {
    it('renders the container', async () => {
        render(<LanguageBreakdown />);
        expect(screen.getByTestId('language-breakdown')).toBeInTheDocument();
    });

    it('renders language bar segments after fetch', async () => {
        render(<LanguageBreakdown />);
        await waitFor(() => {
            const segments = screen.getAllByTitle(/\d+%/);
            expect(segments.length).toBe(mockLanguages.length);
        });
        const tsSegment = screen.getByTitle('TypeScript 40%');
        expect(tsSegment).toHaveStyle({ width: '40%' });
    });

    it('shows only top 6 languages in the list', async () => {
        render(<LanguageBreakdown />);
        await waitFor(() => {
            expect(screen.getByText(/TypeScript/)).toBeInTheDocument();
        });
        const items = screen.getAllByText(/%$/);
        expect(items.length).toBe(6);
        expect(screen.queryByText('Shell')).not.toBeInTheDocument();
    });

    it('shows contribution stats', async () => {
        render(<LanguageBreakdown />);
        await waitFor(() => {
            expect(screen.getByText('1,234')).toBeInTheDocument();
        });
    });

    it('shows streak stats from contribution data', async () => {
        render(<LanguageBreakdown />);
        await waitFor(() => {
            expect(screen.getByText('2d')).toBeInTheDocument();
            expect(screen.getByText('3d')).toBeInTheDocument();
        });
    });

    it('renders GitHub profile link', () => {
        render(<LanguageBreakdown />);
        const link = screen.getByText('testuser');
        expect(link.closest('a')).toHaveAttribute('href', 'https://github.com/testuser');
    });

    it('renders without languages initially', () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        render(<LanguageBreakdown />);
        expect(screen.getByTestId('language-breakdown')).toBeInTheDocument();
        expect(screen.queryByTitle(/\d+%/)).not.toBeInTheDocument();
    });

    it('renders without stats when hook returns no data', () => {
        vi.mocked(useGitHubContributions).mockReturnValue({ data: null, error: false });
        render(<LanguageBreakdown />);
        expect(screen.queryByText(/Contributions/)).not.toBeInTheDocument();
    });

    it('uses known language colors from LANGUAGE_COLORS map', async () => {
        render(<LanguageBreakdown />);
        await waitFor(() => {
            const tsSegment = screen.getByTitle('TypeScript 40%');
            expect(tsSegment).toHaveStyle({ backgroundColor: '#3178c6' });
        });
    });

    it('falls back to lang.color for unknown languages', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([{ name: 'Zig', color: '#ec915c', percentage: 100 }]),
        });
        render(<LanguageBreakdown />);
        await waitFor(() => {
            const segment = screen.getByTitle('Zig 100%');
            expect(segment).toHaveStyle({ backgroundColor: '#ec915c' });
        });
    });
});
