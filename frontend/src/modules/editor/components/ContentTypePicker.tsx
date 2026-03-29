interface ContentTypePickerProps {
    sectionId: string;
    onSelect: (contentType: string) => void;
}

const CONTENT_TYPES = [
    { value: 'story', label: 'Story' },
    { value: 'project', label: 'Project' },
    { value: 'photo_essay', label: 'Photo Essay' },
    { value: 'page', label: 'Page' },
];

export function ContentTypePicker({
    sectionId: _sectionId,
    onSelect,
}: ContentTypePickerProps) {
    return (
        <div
            className="grid grid-cols-2 gap-4 p-4"
            data-testid="content-type-picker"
        >
            {CONTENT_TYPES.map((ct) => (
                <button
                    key={ct.value}
                    onClick={() => onSelect(ct.value)}
                    className="card p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    data-testid={`content-type-${ct.value}`}
                >
                    <div className="text-lg font-medium">{ct.label}</div>
                </button>
            ))}
        </div>
    );
}
