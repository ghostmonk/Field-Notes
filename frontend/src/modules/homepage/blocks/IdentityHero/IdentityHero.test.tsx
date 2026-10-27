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
    });

    it('renders the full headline with emphasis', () => {
        render(<IdentityHero data={mockData} />);
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('Nicholas Hillier');
        expect(heading).toHaveTextContent('Shokunin Kishitsu');
        expect(heading.querySelector('em')).toHaveTextContent('職人');
    });

    it('shows active role in eyebrow', () => {
        render(<IdentityHero data={mockData} />);
        const eyebrow = screen.getByTestId('eyebrow-role');
        expect(eyebrow).toBeInTheDocument();
        expect(eyebrow.textContent).toBe('Engineer');
    });

    it('eyebrow follows role carousel', () => {
        render(<IdentityHero data={mockData} />);
        act(() => {
            vi.advanceTimersByTime(2500);
        });
        expect(screen.getByTestId('eyebrow-role').textContent).toBe('Writer');
    });

    it('renders all role tags', () => {
        render(<IdentityHero data={mockData} />);
        const ticker = screen.getByTestId('role-ticker');
        const roleCount = ticker.children.length;
        expect(roleCount).toBeGreaterThanOrEqual(3);
        expect(screen.getByTestId('role-engineer')).toBeInTheDocument();
        expect(screen.getByTestId('role-writer')).toBeInTheDocument();
        expect(screen.getByTestId('role-photographer')).toBeInTheDocument();
    });

    it('starts with first role active', () => {
        render(<IdentityHero data={mockData} />);
        expect(screen.getByTestId('role-engineer')).toHaveClass('identity-hero__role--active');
        expect(screen.getByTestId('role-writer')).not.toHaveClass('identity-hero__role--active');
    });

    it('cycles to next role after interval', () => {
        render(<IdentityHero data={mockData} />);
        act(() => {
            vi.advanceTimersByTime(2500);
        });
        expect(screen.getByTestId('role-engineer')).not.toHaveClass('identity-hero__role--active');
        expect(screen.getByTestId('role-writer')).toHaveClass('identity-hero__role--active');
    });

    it('wraps around to first role after last', () => {
        render(<IdentityHero data={mockData} />);
        const ticker = screen.getByTestId('role-ticker');
        const roleCount = ticker.children.length;
        act(() => {
            vi.advanceTimersByTime(2500 * roleCount);
        });
        expect(screen.getByTestId('role-engineer')).toHaveClass('identity-hero__role--active');
    });
});
