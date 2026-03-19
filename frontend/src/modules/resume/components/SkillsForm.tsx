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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Skills</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a skill and press Enter"
          className="flex-1 px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
        />
        <button
          type="button"
          onClick={addSkill}
          className="btn btn-primary text-sm"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="badge inline-flex items-center gap-1 px-3 py-1"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(index)}
              className="ml-1 hover:text-red-500"
            >
              x
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
