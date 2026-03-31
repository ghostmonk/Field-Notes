import Link from 'next/link';
import { useRouter } from 'next/router';
import { PhotoEssayCard as PhotoEssayCardType } from '@/shared/types/api';
import { AdminEditButton } from '@/components/AdminEditButton';
import { AdminDraftBadge } from '@/components/AdminDraftBadge';

interface Props {
    essay: PhotoEssayCardType;
    basePath: string;
}

export function PhotoEssayCard({ essay, basePath }: Props) {
    const router = useRouter();

    return (
        <Link href={`${basePath}/${essay.slug || essay.id}`} className="gallery-card" data-testid="photo-essay-card">
            <div className="story-header__actions" style={{ position: 'absolute', top: 'var(--space-sm)', right: 'var(--space-sm)', zIndex: 2 }}>
                <AdminDraftBadge isPublished={essay.is_published} />
                <AdminEditButton
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        router.push({ pathname: '/editor', query: { id: essay.id, section_id: essay.section_id } });
                    }}
                    data-testid={`photo-essay-edit-${essay.id}`}
                />
            </div>
            {essay.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={essay.cover_image_url}
                    srcSet={essay.cover_image_srcset || undefined}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    alt={essay.title}
                    className="gallery-card__image"
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: essay.cover_image_position || '50% 50%' }}
                    onLoad={(e) => e.currentTarget.setAttribute('data-loaded', 'true')}
                    onError={(e) => e.currentTarget.setAttribute('data-loaded', 'true')}
                />
            ) : null}
            <div className="gallery-card__overlay">
                <h2 className="gallery-card__title">{essay.title}</h2>
                {essay.description && (
                    <p className="gallery-card__description">{essay.description}</p>
                )}
                <time className="gallery-card__date" dateTime={essay.createdDate}>
                    {new Date(essay.createdDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </time>
            </div>
        </Link>
    );
}
