import Link from 'next/link';
import Image from 'next/image';
import type { HomepageBlockProps } from '../../types';
import { SectionHeader } from '../SectionHeader';

export function PhotoStrip({ data }: HomepageBlockProps) {
    const { photoEssays, sectionPathMap } = data;
    if (photoEssays.length === 0) return null;

    return (
        <div data-testid="photo-strip-block">
            <SectionHeader label="Photography" annotation={`${photoEssays.length} essays`} />
            <div className="photo-strip">
                {photoEssays.map((essay) => {
                    const sectionPath = essay.section_id
                        ? sectionPathMap[essay.section_id]
                        : undefined;
                    const href = sectionPath
                        ? `/${sectionPath}/${essay.slug}`
                        : '#';

                    return (
                        <Link
                            key={essay.id}
                            href={href}
                            className="photo-strip__cell"
                            data-testid={`photo-cell-${essay.id}`}
                        >
                            {essay.cover_image_url ? (
                                <Image
                                    src={essay.cover_image_url}
                                    alt={essay.title}
                                    fill
                                    sizes="(max-width: 500px) 33vw, 20vw"
                                    className="photo-strip__img"
                                    style={{ objectPosition: essay.cover_image_position || 'center' }}
                                />
                            ) : (
                                <span className="photo-strip__placeholder">{essay.title}</span>
                            )}
                            <span className="photo-strip__count">{essay.photo_count}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
