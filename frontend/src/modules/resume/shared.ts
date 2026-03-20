import { Resume } from '@/shared/types/api';

export const inlineInput =
  'w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-text-secondary)] focus:outline-none py-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] placeholder:opacity-50 transition-colors';

export const RESUME_NAVY = '#1b2838';

export type DescriptionPart = {
  type: 'bullet' | 'paragraph';
  text: string;
};

export function parseDescription(description: string): DescriptionPart[] {
  return description
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((line) => {
      if (line.trimStart().startsWith('- ')) {
        return { type: 'bullet' as const, text: line.trimStart().slice(2) };
      }
      return { type: 'paragraph' as const, text: line };
    });
}

export function getResumeFilename(resume: Resume, ext: string): string {
  return `${resume.contact.full_name.replace(/\s+/g, '_')}_Resume.${ext}`;
}
