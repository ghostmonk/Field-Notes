import Link from 'next/link';
import type { HomepageBlockProps } from '../../types';
import { SectionHeader } from '../SectionHeader';
import { formatDateShort } from '@/shared/utils/formatDate';
import { estimateReadingTime } from '@/shared/utils/readingTime';

export function FeaturedStory({ data }: HomepageBlockProps) {
    const { featuredStory, sectionPathMap } = data;
    if (!featuredStory) return null;

    const sectionPath = featuredStory.section_id
        ? sectionPathMap[featuredStory.section_id]
        : undefined;
    const href = sectionPath
        ? `/${sectionPath}/${featuredStory.slug}`
        : `/stories/${featuredStory.slug}`;

    return (
        <div data-testid="featured-story-block">
            <SectionHeader label="Featured" />
            <Link href={href} className="featured" data-testid="featured-story-link">
                <div className="featured__content">
                    <div className="featured__meta">
                        <span>{formatDateShort(featuredStory.date || featuredStory.createdDate)}</span>
                        <span className="featured__dot" />
                        <span>{estimateReadingTime(featuredStory.content)}</span>
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
