import { forwardRef, ComponentPropsWithoutRef } from 'react';

type BadgeVariant = 'default' | 'draft' | 'featured' | 'success' | 'warning' | 'error' | 'info' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size, className, children, ...props }, ref) => {
    const classes = ['badge'];
    if (variant !== 'default') classes.push(`badge--${variant}`);
    if (size === 'sm') classes.push('badge--sm');
    if (className) classes.push(className);

    return (
      <span ref={ref} className={classes.join(' ')} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
