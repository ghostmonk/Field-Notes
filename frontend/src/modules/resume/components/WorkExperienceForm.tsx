import { WorkExperience } from '@/shared/types/api';

interface WorkExperienceFormProps {
  items: WorkExperience[];
  onChange: (items: WorkExperience[]) => void;
}

const EMPTY_WORK: WorkExperience = {
  company: '',
  title: '',
  start_date: '',
  end_date: undefined,
  current: false,
  description: '',
  technologies: [],
};

export function WorkExperienceForm({
  items,
  onChange,
}: WorkExperienceFormProps) {
  const addItem = () => onChange([...items, { ...EMPTY_WORK }]);

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof WorkExperience,
    value: unknown
  ) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
    });
    onChange(updated);
  };

  const updateTechnologies = (index: number, value: string) => {
    const techs = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    updateItem(index, 'technologies', techs);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Work Experience</h3>
        <button
          type="button"
          onClick={addItem}
          className="btn btn-primary text-sm"
        >
          Add Position
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="card p-4 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-sm text-[var(--color-text-secondary)]">
              Position {index + 1}
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
                Company *
              </label>
              <input
                type="text"
                value={item.company}
                onChange={(e) => updateItem(index, 'company', e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(index, 'title', e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
                required
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
                placeholder="e.g. Jan 2020"
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
                value={item.current ? 'Present' : item.end_date || ''}
                onChange={(e) => updateItem(index, 'end_date', e.target.value)}
                disabled={item.current}
                placeholder="e.g. Dec 2023"
                className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] disabled:opacity-50"
              />
              <label className="flex items-center gap-2 mt-1 text-sm">
                <input
                  type="checkbox"
                  checked={item.current}
                  onChange={(e) =>
                    updateItem(index, 'current', e.target.checked)
                  }
                />
                Current position
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={item.description}
              onChange={(e) =>
                updateItem(index, 'description', e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Technologies (comma-separated)
            </label>
            <input
              type="text"
              value={item.technologies.join(', ')}
              onChange={(e) => updateTechnologies(index, e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
