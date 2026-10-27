import Link from 'next/link';
import type { HomepageBlockProps } from '../../types';
import { SectionHeader } from '../SectionHeader';

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function estimateReadTime(content: string): number {
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.round(words / 250));
}

export function FeaturedStory({ data }: HomepageBlockProps) {
    const { featuredStory, sectionPathMap } = data;
    if (!featuredStory) return null;

    const sectionPath = featuredStory.section_id
        ? sectionPathMap[featuredStory.section_id]
        : undefined;
    const href = sectionPath
        ? `/${sectionPath}/${featuredStory.slug}`
        : `/stories/${featuredStory.slug}`;
    const readMin = estimateReadTime(featuredStory.content);

    return (
        <div data-testid="featured-story-block">
            <SectionHeader label="Featured" />
            <Link href={href} className="featured" data-testid="featured-story-link">
                <div className="featured__content">
                    <div className="featured__meta">
                        <span>{formatDate(featuredStory.date || featuredStory.createdDate)}</span>
                        <span className="featured__dot" />
                        <span>{readMin} min read</span>
                    </div>
                    <h2 className="featured__title">{featuredStory.title}</h2>
                    {featuredStory.tags.length > 0 && (
                        <div className="featured__tags">
                            {featuredStory.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="featured__tag">{tag}</span>
                            ))}
                        </div>
                    )}
                    <span className="featured__read">Read article →</span>
                </div>
            </Link>
        </div>
    );
}
