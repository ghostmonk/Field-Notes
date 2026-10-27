import Link from 'next/link';
import type { HomepageBlockProps } from '../../types';
import { SectionHeader } from '../SectionHeader';
import { formatDateCompact } from '@/shared/utils/formatDate';

export function RecentWriting({ data }: HomepageBlockProps) {
    const { stories, sectionPathMap } = data;
    if (stories.length === 0) return null;

    return (
        <div data-testid="recent-writing-block">
            <SectionHeader label="Recent Writing" annotation={`${stories.length} latest`} />
            <div className="recent-writing">
                {stories.map((story) => {
                    const sectionPath = story.section_id
                        ? sectionPathMap[story.section_id]
                        : undefined;
                    const href = sectionPath
                        ? `/${sectionPath}/${story.slug}`
                        : `/stories/${story.slug}`;

                    return (
                        <Link
                            key={story.id}
                            href={href}
                            className="recent-writing__item"
                            data-testid={`recent-story-${story.id}`}
                        >
                            <span className="recent-writing__title">{story.title}</span>
                            <span className="recent-writing__date">{formatDateCompact(story.date || story.createdDate)}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
