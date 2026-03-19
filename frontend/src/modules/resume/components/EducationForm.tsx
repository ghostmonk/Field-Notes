import { Education } from '@/shared/types/api';

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
        <h3 className="text-lg font-semibold">Education</h3>
        <button
          type="button"
          onClick={addItem}
          className="btn btn-primary text-sm"
        >
          Add Education
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="card p-4 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-sm text-[var(--color-text-secondary)]">
              Education {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-red-500 text-sm hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Institution *
              </label>
              <input
                type="text"
                value={item.institution}
                onChange={(e) =>
                  updateItem(index, 'institution', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Degree *
              </label>
              <input
                type="text"
                value={item.degree}
                onChange={(e) => updateItem(index, 'degree', e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Field of Study
              </label>
              <input
                type="text"
                value={item.field_of_study || ''}
                onChange={(e) =>
                  updateItem(index, 'field_of_study', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Date *
              </label>
              <input
                type="text"
                value={item.start_date}
                onChange={(e) =>
                  updateItem(index, 'start_date', e.target.value)
                }
                placeholder="e.g. Sep 2015"
                className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                End Date
              </label>
              <input
                type="text"
                value={item.end_date || ''}
                onChange={(e) => updateItem(index, 'end_date', e.target.value)}
                placeholder="e.g. Jun 2019"
                className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={item.description || ''}
              onChange={(e) =>
                updateItem(index, 'description', e.target.value)
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
