import { forwardRef, ComponentPropsWithoutRef } from 'react';

interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, ...props }, ref) => {
    const classes = ['select'];
    if (error) classes.push('select--error');
    if (className) classes.push(className);

    return (
      <select ref={ref} className={classes.join(' ')} {...props}>
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';
