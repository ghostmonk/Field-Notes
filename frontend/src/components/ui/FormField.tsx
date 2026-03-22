import { ReactNode } from 'react';

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, hint, required, className, children }: FormFieldProps) {
  const classes = ['form-field'];
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      {label && (
        <label className="form-field__label" htmlFor={htmlFor}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {error && <span className="form-field__error" role="alert">{error}</span>}
      {hint && !error && <span className="form-field__hint">{hint}</span>}
    </div>
  );
}
