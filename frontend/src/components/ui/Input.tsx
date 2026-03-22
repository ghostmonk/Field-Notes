import { forwardRef, ComponentPropsWithoutRef } from 'react';

type InputVariant = 'default' | 'inline';

interface InputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size'> {
  variant?: InputVariant;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', error, className, ...props }, ref) => {
    const classes = ['input'];
    if (variant === 'inline') classes.push('input--inline');
    if (error) classes.push('input--error');
    if (className) classes.push(className);

    return <input ref={ref} className={classes.join(' ')} {...props} />;
  }
);

Input.displayName = 'Input';
