interface Props {
    tags: string[];
    activeTag: string | null;
    onTagChange: (tag: string | null) => void;
}

export function GalleryFilterBar({ tags, activeTag, onTagChange }: Props) {
    if (tags.length === 0) return null;

    return (
        <div className="gallery-filter" data-testid="gallery-filter">
            <button
                className={`gallery-filter__tag ${activeTag === null ? 'gallery-filter__tag--active' : ''}`}
                onClick={() => onTagChange(null)}
            >
                All
            </button>
            {tags.map((tag) => (
                <button
                    key={tag}
                    className={`gallery-filter__tag ${activeTag === tag ? 'gallery-filter__tag--active' : ''}`}
                    onClick={() => onTagChange(tag)}
                >
                    {tag}
                </button>
            ))}
        </div>
    );
}
