import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PhotoStrip } from './PhotoStrip';
import type { HomepageData } from '../../types';
import type { PhotoEssayCard } from '@/shared/types/api';

function makeEssay(overrides: Partial<PhotoEssayCard> = {}): PhotoEssayCard {
    return {
        id: 'pe1',
        title: 'Street Photography',
        slug: 'street-photography',
        cover_image_url: '/images/test.jpg',
        is_published: true,
        photo_count: 12,
        tags: [],
        section_id: 'sec-photo',
        createdDate: '2026-10-01',
        updatedDate: '2026-10-20',
        ...overrides,
    };
}

const mockData: HomepageData = {
    stories: [],
    featuredStory: null,
    projects: [],
    photoEssays: [
        makeEssay({ id: 'pe1', title: 'Street', slug: 'street', photo_count: 12 }),
        makeEssay({ id: 'pe2', title: 'Landscape', slug: 'landscape', photo_count: 8 }),
    ],
    sectionPathMap: { 'sec-photo': 'photography' },
};

afterEach(cleanup);

describe('PhotoStrip', () => {
    it('renders nothing when no photo essays', () => {
        const { container } = render(
            <PhotoStrip data={{ ...mockData, photoEssays: [] }} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders photo cells', () => {
        render(<PhotoStrip data={mockData} />);
        expect(screen.getByTestId('photo-cell-pe1')).toBeInTheDocument();
        expect(screen.getByTestId('photo-cell-pe2')).toBeInTheDocument();
    });

    it('shows photo count overlay', () => {
        render(<PhotoStrip data={mockData} />);
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('links to section-based paths', () => {
        render(<PhotoStrip data={mockData} />);
        const link = screen.getByTestId('photo-cell-pe1');
        expect(link).toHaveAttribute('href', '/photography/street');
    });

    it('shows section header with count', () => {
        render(<PhotoStrip data={mockData} />);
        expect(screen.getByText('Photography')).toBeInTheDocument();
        expect(screen.getByText('2 essays')).toBeInTheDocument();
    });
});
