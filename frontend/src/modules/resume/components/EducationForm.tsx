import { Education } from '@/shared/types/api';
import { inlineInput } from '../shared';

interface EducationFormProps {
  items: Education[];
  onChange: (items: Education[]) => void;
}

const EMPTY_EDUCATION: Education = {
  institution: '',
  degree: '',
  field_of_study: undefined,
  start_date: '',
  end_date: undefined,
  description: undefined,
};

export function EducationForm({ items, onChange }: EducationFormProps) {
  const addItem = () => onChange([...items, { ...EMPTY_EDUCATION }]);

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof Education,
    value: string
  ) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value || undefined };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Education
        </h2>
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          + Add
        </button>
      </div>
      {items.map((item, index) => (
        <div
          key={index}
          className="group relative pl-4 border-l-2 border-[var(--color-border)] hover:border-[var(--color-text-secondary)] transition-colors space-y-1"
        >
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="absolute top-0 right-0 text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Remove
          </button>
          <input
            type="text"
            value={item.degree}
            onChange={(e) => updateItem(index, 'degree', e.target.value)}
            placeholder="Degree"
            className={`${inlineInput} font-semibold`}
          />
          <div className="flex gap-4 items-baseline">
            <input
              type="text"
              value={item.institution}
              onChange={(e) =>
                updateItem(index, 'institution', e.target.value)
              }
              placeholder="Institution"
              className={`${inlineInput} text-sm flex-1`}
            />
            <input
              type="text"
              value={item.field_of_study || ''}
              onChange={(e) =>
                updateItem(index, 'field_of_study', e.target.value)
              }
              placeholder="Field of Study"
              className={`${inlineInput} text-sm flex-1`}
            />
          </div>
          <div className="flex gap-1 items-baseline">
            <input
              type="text"
              value={item.start_date}
              onChange={(e) =>
                updateItem(index, 'start_date', e.target.value)
              }
              placeholder="Start"
              className={`${inlineInput} text-xs w-24`}
            />
            <span className="text-xs text-[var(--color-text-secondary)]">
              -
            </span>
            <input
              type="text"
              value={item.end_date || ''}
              onChange={(e) => updateItem(index, 'end_date', e.target.value)}
              placeholder="End"
              className={`${inlineInput} text-xs w-24`}
            />
          </div>
          <textarea
            value={item.description || ''}
            onChange={(e) =>
              updateItem(index, 'description', e.target.value)
            }
            rows={2}
            placeholder="Description..."
            className={`${inlineInput} text-sm resize-none`}
          />
        </div>
      ))}
    </div>
  );
}
