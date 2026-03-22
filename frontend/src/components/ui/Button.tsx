import { forwardRef, ComponentPropsWithoutRef, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<'button'>, keyof ButtonBaseProps> & {
    as?: 'button';
  };

type ButtonAsAnchor = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<'a'>, keyof ButtonBaseProps> & {
    as: 'a';
  };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

function buildClassName(variant?: ButtonVariant, size?: ButtonSize, className?: string): string {
  const classes = ['btn'];
  if (variant) classes.push(`btn--${variant}`);
  if (size && size !== 'md') classes.push(`btn--${size}`);
  if (className) classes.push(className);
  return classes.join(' ');
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const { as, variant, size, loading, children, className, ...rest } = props;
    const cls = buildClassName(variant, size, className);

    if (as === 'a') {
      const anchorProps = rest as ComponentPropsWithoutRef<'a'>;
      return (
        <a ref={ref as React.Ref<HTMLAnchorElement>} className={cls} {...anchorProps}>
          {children}
        </a>
      );
    }

    const { disabled, type, ...buttonProps } = rest as ComponentPropsWithoutRef<'button'>;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type ?? 'button'}
        className={cls}
        {...buttonProps}
        disabled={loading || disabled}
      >
        {loading && <span className="btn__spinner" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
