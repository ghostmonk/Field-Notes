import React, { useState } from 'react';
import { PhotoEssay } from '@/shared/types/api';
import { MasonryGrid } from './MasonryGrid';

interface Props {
    essay: PhotoEssay;
}

export function PhotoEssayPage({ essay }: Props) {
    const [_viewerIndex, setViewerIndex] = useState<number | null>(null);
    const sortedPhotos = [...essay.photos].sort((a, b) => a.sort_order - b.sort_order);

    return (
        <div className="photo-essay-page" data-testid="photo-essay-page">
            <header className="photo-essay-page__header">
                <h1 className="photo-essay-page__title">{essay.title}</h1>
                {essay.description && (
                    <p className="photo-essay-page__description">{essay.description}</p>
                )}
            </header>

            <MasonryGrid
                photos={sortedPhotos}
                onPhotoClick={setViewerIndex}
            />

            {/* PhotoViewer will be added in Task 7 */}
        </div>
    );
}
