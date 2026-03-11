import React from 'react';
import Link from 'next/link';
import { PhotoEssayCard as PhotoEssayCardType } from '@/shared/types/api';

interface Props {
    essay: PhotoEssayCardType;
    basePath: string;
}

export function PhotoEssayCard({ essay, basePath }: Props) {
    return (
        <Link href={`${basePath}/${essay.id}`} className="gallery-card" data-testid="photo-essay-card">
            <div className="gallery-card__image-wrapper">
                <img
                    src={essay.cover_image_url}
                    alt={essay.title}
                    className="gallery-card__image"
                    loading="lazy"
                />
            </div>
            <div className="gallery-card__info">
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
