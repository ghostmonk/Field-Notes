import { ContactInfo } from '@/shared/types/api';
import { Input } from '@/components/ui';

interface ContactFormProps {
  contact: ContactInfo;
  onChange: (contact: ContactInfo) => void;
}

export function ContactForm({ contact, onChange }: ContactFormProps) {
  const update = (field: keyof ContactInfo, value: string) => {
    onChange({ ...contact, [field]: value || undefined });
  };

  return (
    <div className="space-y-3">
      <Input
        variant="inline"
        type="text"
        value={contact.full_name || ''}
        onChange={(e) => update('full_name', e.target.value)}
        placeholder="Your Name"
        className="text-3xl font-bold"
      />
      <Input
        variant="inline"
        type="text"
        value={contact.title || ''}
        onChange={(e) => update('title', e.target.value)}
        placeholder="Professional title, e.g. Staff Software Engineer"
        className="text-base text-[var(--color-text-secondary)]"
      />
      <Input
        variant="inline"
        type="text"
        value={contact.email || ''}
        onChange={(e) => update('email', e.target.value)}
        placeholder="email@example.com"
        className="text-sm"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
        <Input
          variant="inline"
          type="text"
          value={contact.phone || ''}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="Phone"
          className="text-sm"
        />
        <Input
          variant="inline"
          type="text"
          value={contact.location || ''}
          onChange={(e) => update('location', e.target.value)}
          placeholder="Location"
          className="text-sm"
        />
        <Input
          variant="inline"
          type="text"
          value={contact.website || ''}
          onChange={(e) => update('website', e.target.value)}
          placeholder="Website"
          className="text-sm"
        />
        <Input
          variant="inline"
          type="text"
          value={contact.linkedin || ''}
          onChange={(e) => update('linkedin', e.target.value)}
          placeholder="LinkedIn URL"
          className="text-sm"
        />
        <Input
          variant="inline"
          type="text"
          value={contact.github || ''}
          onChange={(e) => update('github', e.target.value)}
          placeholder="GitHub URL"
          className="text-sm"
        />
      </div>
    </div>
  );
}
