import { useState } from 'react';
import { Input, Badge } from '@/components/ui';

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
          <Badge key={index} variant="outline">
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(index)}
              className="ml-1 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
            >
              x
            </button>
          </Badge>
        ))}
        <Input
          variant="inline"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addSkill}
          placeholder="Add skill..."
          className="px-1 text-sm w-32"
        />
      </div>
    </div>
  );
}
