import { forwardRef, ComponentPropsWithoutRef, useCallback, useRef, useEffect } from 'react';

interface TextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  error?: boolean;
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, autoResize, className, onChange, value, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    const classes = ['textarea'];
    if (error) classes.push('textarea--error');
    if (className) classes.push(className);

    const resize = useCallback(() => {
      const el = internalRef.current;
      if (el && autoResize) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    }, [autoResize]);

    useEffect(() => {
      resize();
    }, [resize, value]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        resize();
        onChange?.(e);
      },
      [onChange, resize]
    );

    return (
      <textarea
        ref={(el) => {
          internalRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        className={classes.join(' ')}
        onChange={handleChange}
        value={value}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
