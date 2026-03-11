import React, { useCallback, useMemo, useState } from 'react';
import { PhotoEssay } from '@/shared/types/api';
import { MasonryGrid } from './MasonryGrid';
import { PhotoViewer } from './PhotoViewer';

interface Props {
    essay: PhotoEssay;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function PhotoEssayPage({ essay, onEdit, onDelete }: Props) {
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const handleCloseViewer = useCallback(() => setViewerIndex(null), []);
    const sortedPhotos = useMemo(
        () => [...essay.photos].sort((a, b) => a.sort_order - b.sort_order),
        [essay.photos]
    );

    return (
        <div className="photo-essay-page" data-testid="photo-essay-page">
            <header className="photo-essay-page__header">
                <h1 className="photo-essay-page__title">{essay.title}</h1>
                {essay.description && (
                    <p className="photo-essay-page__description">{essay.description}</p>
                )}
                {(onEdit || onDelete) && (
                    <div className="photo-essay-page__actions">
                        {onEdit && (
                            <button className="btn btn--secondary btn--sm" onClick={onEdit} data-testid="photo-essay-edit-btn">
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button className="btn btn--danger btn--sm" onClick={onDelete} data-testid="photo-essay-delete-btn">
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </header>

            <MasonryGrid
                photos={sortedPhotos}
                onPhotoClick={setViewerIndex}
            />

            {viewerIndex !== null && (
                <PhotoViewer
                    photos={sortedPhotos}
                    initialIndex={viewerIndex}
                    onClose={handleCloseViewer}
                />
            )}
        </div>
    );
}
