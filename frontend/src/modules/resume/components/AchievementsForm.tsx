interface AchievementsFormProps {
  achievements: string[];
  onChange: (achievements: string[]) => void;
}

const inlineInput =
  'w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-text-secondary)] focus:outline-none py-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] placeholder:opacity-50 transition-colors';

export function AchievementsForm({
  achievements,
  onChange,
}: AchievementsFormProps) {
  const addItem = () => onChange([...achievements, '']);
  const removeItem = (index: number) =>
    onChange(achievements.filter((_, i) => i !== index));
  const updateItem = (index: number, value: string) => {
    const updated = [...achievements];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Achievements
        </h2>
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          + Add
        </button>
      </div>
      {achievements.map((item, index) => (
        <div key={index} className="group flex gap-2 items-start">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder="Achievement..."
            className={`${inlineInput} text-sm flex-1`}
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
