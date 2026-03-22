import { forwardRef, ComponentPropsWithoutRef, ReactNode } from 'react';

type CardVariant = 'default' | 'draft' | 'featured';

type CardBaseProps = {
  variant?: CardVariant;
  hoverable?: boolean;
  children: ReactNode;
};

type CardAsDiv = CardBaseProps &
  Omit<ComponentPropsWithoutRef<'div'>, keyof CardBaseProps> & {
    as?: 'div';
  };

type CardAsAnchor = CardBaseProps &
  Omit<ComponentPropsWithoutRef<'a'>, keyof CardBaseProps> & {
    as: 'a';
  };

type CardProps = CardAsDiv | CardAsAnchor;

function CardBody({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  const classes = ['card__body'];
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')} {...props}>
      {children}
    </div>
  );
}

function CardMedia({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  const classes = ['card__media'];
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')} {...props}>
      {children}
    </div>
  );
}

function CardFooter({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  const classes = ['card__footer'];
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')} {...props}>
      {children}
    </div>
  );
}

function buildCardClassName(
  variant?: CardVariant,
  hoverable?: boolean,
  asAnchor?: boolean,
  className?: string
): string {
  const classes = ['card'];
  if (variant && variant !== 'default') classes.push(`card--${variant}`);
  if (hoverable) classes.push('card--hoverable');
  if (asAnchor) classes.push('card--link');
  if (className) classes.push(className);
  return classes.join(' ');
}

const CardRoot = forwardRef<HTMLDivElement | HTMLAnchorElement, CardProps>(
  (props, ref) => {
    const { as, variant, hoverable, children, className, ...rest } = props;
    const cls = buildCardClassName(variant, hoverable, as === 'a', className);

    if (as === 'a') {
      const anchorProps = rest as ComponentPropsWithoutRef<'a'>;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={cls}
          {...anchorProps}
        >
          {children}
        </a>
      );
    }

    const divProps = rest as ComponentPropsWithoutRef<'div'>;
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} className={cls} {...divProps}>
        {children}
      </div>
    );
  }
);

CardRoot.displayName = 'Card';

export const Card = Object.assign(CardRoot, {
  Body: CardBody,
  Media: CardMedia,
  Footer: CardFooter,
});
