import { useState, useRef, useEffect } from 'react';
import { SECTION_ICONS, SectionIcon, iconMap } from '@/shared/lib/navIcons';

interface IconPickerProps {
    value: SectionIcon;
    onChange: (icon: SectionIcon) => void;
    disabled?: boolean;
}

const SELECTABLE_ICONS = SECTION_ICONS.filter(icon => icon !== 'default');

export default function IconPicker({ value, onChange, disabled }: IconPickerProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const SelectedIcon = iconMap[value] || iconMap['default'];

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</span>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                data-testid="icon-picker-trigger"
                aria-expanded={open}
            >
                <SelectedIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
            </button>

            {open && (
                <div
                    className="absolute z-10 mt-1 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-48 overflow-y-auto"
                    data-testid="icon-picker"
                >
                    <div className="grid grid-cols-7 gap-1">
                        {SELECTABLE_ICONS.map(key => {
                            const Icon = iconMap[key];
                            const selected = value === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => { onChange(key); setOpen(false); }}
                                    disabled={disabled}
                                    title={key}
                                    className={`p-1.5 rounded transition-colors ${
                                        selected
                                            ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                    data-testid={`icon-option-${key}`}
                                    aria-pressed={selected}
                                >
                                    <Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
