import { useState, useEffect } from 'react';
import { WorkExperience } from '@/shared/types/api';
import { inlineInput } from '../shared';

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

function TechnologiesInput({
  technologies,
  onCommit,
}: {
  technologies: string[];
  onCommit: (techs: string[]) => void;
}) {
  const [text, setText] = useState(technologies.join(', '));
  const [focused, setFocused] = useState(false);

  // Sync from prop when not actively editing
  useEffect(() => {
    if (!focused) {
      setText(technologies.join(', '));
    }
  }, [technologies, focused]);

  const handleBlur = () => {
    setFocused(false);
    const techs = text
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onCommit(techs);
  };

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      placeholder="Technologies (comma-separated)"
      className={`${inlineInput} text-sm text-[var(--color-text-secondary)]`}
    />
  );
}

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Experience
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
            value={item.title}
            onChange={(e) => updateItem(index, 'title', e.target.value)}
            placeholder="Job Title"
            className={`${inlineInput} font-semibold flex-1`}
          />
          <div className="flex gap-4 items-baseline">
            <input
              type="text"
              value={item.company}
              onChange={(e) => updateItem(index, 'company', e.target.value)}
              placeholder="Company"
              className={`${inlineInput} text-sm flex-1`}
            />
            <input
              type="text"
              value={item.company_url || ''}
              onChange={(e) => updateItem(index, 'company_url', e.target.value || undefined)}
              placeholder="Company website URL"
              className={`${inlineInput} text-xs text-[var(--color-text-secondary)]`}
            />
            <div className="flex gap-1 items-baseline shrink-0">
              <input
                type="text"
                value={item.start_date}
                onChange={(e) =>
                  updateItem(index, 'start_date', e.target.value)
                }
                placeholder="Start"
                className={`${inlineInput} text-xs w-24 text-right`}
              />
              <span className="text-xs text-[var(--color-text-secondary)]">
                -
              </span>
              <input
                type="text"
                value={item.current ? 'Present' : item.end_date || ''}
                onChange={(e) =>
                  updateItem(index, 'end_date', e.target.value)
                }
                disabled={item.current}
                placeholder="End"
                className={`${inlineInput} text-xs w-24 disabled:opacity-50`}
              />
              <label className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] shrink-0 ml-1">
                <input
                  type="checkbox"
                  checked={item.current}
                  onChange={(e) =>
                    updateItem(index, 'current', e.target.checked)
                  }
                  className="w-3 h-3"
                />
                Current
              </label>
            </div>
          </div>
          <textarea
            value={item.description}
            onChange={(e) =>
              updateItem(index, 'description', e.target.value)
            }
            rows={2}
            placeholder="Description..."
            className={`${inlineInput} text-sm resize-none`}
          />
          <TechnologiesInput
            technologies={item.technologies}
            onCommit={(techs) => updateItem(index, 'technologies', techs)}
          />
        </div>
      ))}
    </div>
  );
}
