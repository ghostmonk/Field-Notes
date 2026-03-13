import { SECTION_ICONS, SectionIcon, iconMap } from '@/shared/lib/navIcons';

interface IconPickerProps {
    value: SectionIcon;
    onChange: (icon: SectionIcon) => void;
    disabled?: boolean;
}

const SELECTABLE_ICONS = SECTION_ICONS.filter(icon => icon !== 'default');

export default function IconPicker({ value, onChange, disabled }: IconPickerProps) {
    return (
        <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</span>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1" data-testid="icon-picker">
                {SELECTABLE_ICONS.map(key => {
                    const Icon = iconMap[key];
                    const selected = value === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onChange(key)}
                            disabled={disabled}
                            title={key}
                            className={`p-2 rounded transition-colors ${
                                selected
                                    ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            data-testid={`icon-option-${key}`}
                            aria-pressed={selected}
                        >
                            <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
