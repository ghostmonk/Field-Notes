import Link from 'next/link';
import { Button } from '@/components/ui';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && (
        <Link href={action.href} data-testid="empty-state-action">
          <Button variant="primary" className="mt-4">{action.label}</Button>
        </Link>
      )}
    </div>
  );
}
