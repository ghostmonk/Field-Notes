import { ContactInfo } from '@/shared/types/api';

interface ContactFormProps {
  contact: ContactInfo;
  onChange: (contact: ContactInfo) => void;
}

const inlineInput =
  'w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-text-secondary)] focus:outline-none py-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] placeholder:opacity-50 transition-colors';

export function ContactForm({ contact, onChange }: ContactFormProps) {
  const update = (field: keyof ContactInfo, value: string) => {
    onChange({ ...contact, [field]: value || undefined });
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={contact.full_name || ''}
        onChange={(e) => update('full_name', e.target.value)}
        placeholder="Your Name"
        className={`${inlineInput} text-3xl font-bold`}
      />
      <input
        type="text"
        value={contact.email || ''}
        onChange={(e) => update('email', e.target.value)}
        placeholder="email@example.com"
        className={`${inlineInput} text-sm`}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
        <input
          type="text"
          value={contact.phone || ''}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="Phone"
          className={`${inlineInput} text-sm`}
        />
        <input
          type="text"
          value={contact.location || ''}
          onChange={(e) => update('location', e.target.value)}
          placeholder="Location"
          className={`${inlineInput} text-sm`}
        />
        <input
          type="text"
          value={contact.website || ''}
          onChange={(e) => update('website', e.target.value)}
          placeholder="Website"
          className={`${inlineInput} text-sm`}
        />
        <input
          type="text"
          value={contact.linkedin || ''}
          onChange={(e) => update('linkedin', e.target.value)}
          placeholder="LinkedIn URL"
          className={`${inlineInput} text-sm`}
        />
        <input
          type="text"
          value={contact.github || ''}
          onChange={(e) => update('github', e.target.value)}
          placeholder="GitHub URL"
          className={`${inlineInput} text-sm`}
        />
      </div>
    </div>
  );
}
