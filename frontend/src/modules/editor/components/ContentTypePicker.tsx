import { CONTENT_TYPE_OPTIONS } from "@/shared/constants/sectionTypes";

interface ContentTypePickerProps {
    onSelect: (contentType: string) => void;
}

export function ContentTypePicker({
    onSelect,
}: ContentTypePickerProps) {
    return (
        <div
            className="grid grid-cols-2 gap-4 p-4"
            data-testid="content-type-picker"
        >
            {CONTENT_TYPE_OPTIONS.map((ct) => (
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
