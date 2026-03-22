import { forwardRef, ComponentPropsWithoutRef } from 'react';

interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    const classes = ['checkbox'];
    if (className) classes.push(className);

    return (
      <input ref={ref} type="checkbox" className={classes.join(' ')} {...props} />
    );
  }
);

Checkbox.displayName = 'Checkbox';
