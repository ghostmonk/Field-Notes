import Link from 'next/link';
import { ListingItem } from '@/shared/types/listing';

interface ListingCardProps {
    item: ListingItem;
    sectionPath: string;
}

export function ListingCard({ item, sectionPath }: ListingCardProps) {
    const href =
        item.item_type === 'section' && item.path
            ? `/${item.path}`
            : `/${sectionPath}/${item.slug}`;

    return (
        <Link href={href} className="card" data-testid="listing-card">
            {item.image_url && (
                <div className="card__image-container">
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="card__image"
                        loading="lazy"
                    />
                </div>
            )}
            <div className="card__body">
                <h3 className="card__title">{item.title}</h3>
                {item.summary && (
                    <p className="card__summary">{item.summary}</p>
                )}
                {item.tags && item.tags.length > 0 && (
                    <div className="card__tags">
                        {item.tags.map((tag) => (
                            <span key={tag} className="badge badge--secondary">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                {item.created_at && (
                    <time className="card__date" dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </time>
                )}
                {item.item_type === 'section' && (
                    <span className="badge badge--primary">
                        {item.display_type}
                    </span>
                )}
            </div>
        </Link>
    );
}
