import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ListingCard } from './ListingCard';

vi.mock('next/link', () => ({
    default: ({
        children,
        href,
        ...props
    }: {
        children: React.ReactNode;
        href: string;
        [key: string]: unknown;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

afterEach(cleanup);

describe('ListingCard', () => {
    const baseItem = {
        id: '1',
        slug: 'test',
        item_type: 'content' as const,
        content_type: 'story',
        title: 'Test Post',
        tags: [],
        is_published: true,
        is_featured: false,
    };

    it('renders title', () => {
        render(<ListingCard item={baseItem} sectionPath="blog" />);
        expect(screen.getByText('Test Post')).toBeInTheDocument();
    });

    it('renders summary when present', () => {
        render(
            <ListingCard
                item={{ ...baseItem, summary: 'A summary' }}
                sectionPath="blog"
            />,
        );
        expect(screen.getByText('A summary')).toBeInTheDocument();
    });

    it('omits image when not present', () => {
        render(<ListingCard item={baseItem} sectionPath="blog" />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders image when present', () => {
        render(
            <ListingCard
                item={{ ...baseItem, image_url: '/img.webp' }}
                sectionPath="blog"
            />,
        );
        expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('links to correct path for content', () => {
        render(<ListingCard item={baseItem} sectionPath="blog" />);
        expect(screen.getByTestId('listing-card')).toHaveAttribute(
            'href',
            '/blog/test',
        );
    });

    it('links to section path for section items', () => {
        const sectionItem = {
            ...baseItem,
            item_type: 'section' as const,
            path: 'blog/tech',
            content_type: undefined,
        };
        render(<ListingCard item={sectionItem} sectionPath="blog" />);
        expect(screen.getByTestId('listing-card')).toHaveAttribute(
            'href',
            '/blog/tech',
        );
    });

    it('renders tags', () => {
        render(
            <ListingCard
                item={{ ...baseItem, tags: ['python', 'react'] }}
                sectionPath="blog"
            />,
        );
        expect(screen.getByText('python')).toBeInTheDocument();
        expect(screen.getByText('react')).toBeInTheDocument();
    });

    it('renders date when present', () => {
        render(
            <ListingCard
                item={{ ...baseItem, created_at: '2026-01-15T12:00:00Z' }}
                sectionPath="blog"
            />,
        );
        expect(screen.getByText('January 15, 2026')).toBeInTheDocument();
    });

    it('renders display_type badge for section items', () => {
        const sectionItem = {
            ...baseItem,
            item_type: 'section' as const,
            path: 'blog/tech',
            display_type: 'card-grid',
        };
        render(<ListingCard item={sectionItem} sectionPath="blog" />);
        expect(screen.getByText('card-grid')).toBeInTheDocument();
    });
});
