import { ContactInfo } from '@/shared/types/api';

interface ContactFormProps {
  contact: ContactInfo;
  onChange: (contact: ContactInfo) => void;
}

export function ContactForm({ contact, onChange }: ContactFormProps) {
  const update = (field: keyof ContactInfo, value: string) => {
    onChange({ ...contact, [field]: value || undefined });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Contact Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name *</label>
          <input
            type="text"
            value={contact.full_name || ''}
            onChange={(e) => update('full_name', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            type="email"
            value={contact.email || ''}
            onChange={(e) => update('email', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            value={contact.phone || ''}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            value={contact.location || ''}
            onChange={(e) => update('location', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Website</label>
          <input
            type="url"
            value={contact.website || ''}
            onChange={(e) => update('website', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">LinkedIn</label>
          <input
            type="url"
            value={contact.linkedin || ''}
            onChange={(e) => update('linkedin', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">GitHub</label>
          <input
            type="url"
            value={contact.github || ''}
            onChange={(e) => update('github', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
          />
        </div>
      </div>
    </div>
  );
}
