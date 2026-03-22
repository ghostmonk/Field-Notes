import Link from 'next/link';

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
        <Link href={action.href} className="btn btn--primary mt-4" data-testid="empty-state-action">
          {action.label}
        </Link>
      )}
    </div>
  );
}
