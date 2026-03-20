import { useState } from 'react';

interface SkillsFormProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

export function SkillsForm({ skills, onChange }: SkillsFormProps) {
  const [input, setInput] = useState('');

  const addSkill = () => {
    const trimmed = input.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
      setInput('');
    }
  };

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        Skills
      </h2>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(index)}
              className="ml-1 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
            >
              x
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addSkill}
          placeholder="Add skill..."
          className="bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-text-secondary)] focus:outline-none py-1 px-1 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] placeholder:opacity-50 transition-colors w-32"
        />
      </div>
    </div>
  );
}
