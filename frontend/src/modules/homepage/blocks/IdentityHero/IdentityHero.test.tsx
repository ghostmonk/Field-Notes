import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { IdentityHero } from './IdentityHero';
import type { HomepageData } from '../../types';

const mockData: HomepageData = {
    stories: [],
    featuredStory: null,
    projects: [],
    photoEssays: [],
    sectionPathMap: {},
};

afterEach(cleanup);

describe('IdentityHero', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the hero section', () => {
        render(<IdentityHero data={mockData} />);
        expect(screen.getByTestId('identity-hero')).toBeInTheDocument();
        expect(screen.getByText('ghostmonk.com')).toBeInTheDocument();
    });

    it('renders the name with italic emphasis', () => {
        render(<IdentityHero data={mockData} />);
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('Nicholas Hillier');
        expect(heading.querySelector('em')).toHaveTextContent('Hillier');
    });

    it('renders all role tags', () => {
        render(<IdentityHero data={mockData} />);
        const ticker = screen.getByTestId('role-ticker');
        expect(ticker.children).toHaveLength(8);
        expect(screen.getByTestId('role-writer')).toBeInTheDocument();
        expect(screen.getByTestId('role-photographer')).toBeInTheDocument();
        expect(screen.getByTestId('role-engineer')).toBeInTheDocument();
    });

    it('starts with first role active', () => {
        render(<IdentityHero data={mockData} />);
        expect(screen.getByTestId('role-writer')).toHaveClass('identity-hero__role--active');
        expect(screen.getByTestId('role-photographer')).not.toHaveClass('identity-hero__role--active');
    });

    it('cycles to next role after interval', () => {
        render(<IdentityHero data={mockData} />);
        act(() => {
            vi.advanceTimersByTime(2500);
        });
        expect(screen.getByTestId('role-writer')).not.toHaveClass('identity-hero__role--active');
        expect(screen.getByTestId('role-photographer')).toHaveClass('identity-hero__role--active');
    });

    it('wraps around to first role after last', () => {
        render(<IdentityHero data={mockData} />);
        act(() => {
            vi.advanceTimersByTime(2500 * 8);
        });
        expect(screen.getByTestId('role-writer')).toHaveClass('identity-hero__role--active');
    });
});
