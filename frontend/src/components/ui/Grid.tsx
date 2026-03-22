import { forwardRef, ComponentPropsWithoutRef } from 'react';

type GridVariant = 'responsive' | '1-col' | '2-col' | '3-cols';

interface GridProps extends ComponentPropsWithoutRef<'div'> {
  variant?: GridVariant;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ variant, className, children, ...props }, ref) => {
    const classes = ['grid'];
    if (variant) classes.push(`grid--${variant}`);
    if (className) classes.push(className);

    return (
      <div ref={ref} className={classes.join(' ')} {...props}>
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';
