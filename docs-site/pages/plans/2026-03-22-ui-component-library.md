# UI Component Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React component library (`components/ui/`) that wraps the CSS variable/class system, enforcing consistent styling across all forms, dialogs, cards, and interactive elements. Every feature consumer imports components, never raw CSS class strings.

**Architecture:** Three layers — design tokens (CSS variables in `tokens.css`), template CSS classes (in `components.css`), and React components (in `components/ui/`). Components map typed props to CSS classes. Zero hardcoded colors. Fork-safe: swap `templates/default/` to rebrand.

**Tech Stack:** React, TypeScript, CSS custom properties, forwardRef, ComponentPropsWithoutRef

---

### Task 1: CSS class definitions for form elements

Add new CSS classes to `components.css` for inputs, textareas, selects, dialogs, form fields, tabs, and badge variants. These classes use existing CSS variables from `tokens.css`.

**Files:**
- Modify: `frontend/src/templates/default/styles/components.css`

**Step 1: Add input classes after the `.btn--lg` block (after line 330)**

```css
/* Form inputs */
.input {
  display: block;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-body);
  color: var(--color-text-primary);
  background-color: var(--color-surface-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  transition: var(--transition-colors), border-color var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.input--inline {
  background-color: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  border-radius: 0;
  padding: var(--space-xs) 0;
}

.input--inline:hover {
  border-bottom-color: var(--color-border-primary);
}

.input--inline:focus {
  border-bottom-color: var(--color-border-focus);
  box-shadow: none;
}

.input--error {
  border-color: var(--color-status-error);
}

.input--error:focus {
  border-color: var(--color-status-error);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}

/* Textarea */
.textarea {
  display: block;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-body);
  color: var(--color-text-primary);
  background-color: var(--color-surface-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  transition: var(--transition-colors), border-color var(--transition-fast);
  resize: vertical;
}

.textarea:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
}

.textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.textarea::placeholder {
  color: var(--color-text-tertiary);
}

.textarea--error {
  border-color: var(--color-status-error);
}

/* Select */
.select {
  display: block;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-body);
  color: var(--color-text-primary);
  background-color: var(--color-surface-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  transition: var(--transition-colors), border-color var(--transition-fast);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M3 5l3 3 3-3'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-md) center;
  padding-right: var(--space-2xl);
}

.select:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
}

.select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select--error {
  border-color: var(--color-status-error);
}

/* Checkbox */
.checkbox {
  width: 1rem;
  height: 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-secondary);
  background-color: var(--color-surface-secondary);
  accent-color: var(--color-brand-primary);
  cursor: pointer;
}

.checkbox:focus {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}
```

**Step 2: Add dialog classes**

```css
/* Dialog */
.dialog {
  background-color: var(--color-surface-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
  padding: 0;
  max-width: 28rem;
  width: 100%;
  box-shadow: 0 4px 24px var(--color-shadow-dark);
}

.dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.dialog__header {
  padding: var(--space-xl) var(--space-xl) 0;
}

.dialog__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  margin: 0;
}

.dialog__body {
  padding: var(--space-lg) var(--space-xl);
}

.dialog__footer {
  padding: 0 var(--space-xl) var(--space-xl);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
}
```

**Step 3: Add form field classes**

```css
/* Form field */
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.form-field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.form-field__error {
  font-size: var(--font-size-xs);
  color: var(--color-status-error);
}

.form-field__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
```

**Step 4: Add badge variant classes (extend existing `.badge` block around line 332)**

```css
.badge--success {
  background-color: var(--color-status-success);
  color: #ffffff;
}

.badge--warning {
  background-color: var(--color-status-warning);
  color: #ffffff;
}

.badge--error {
  background-color: var(--color-status-error);
  color: #ffffff;
}

.badge--info {
  background-color: var(--color-status-info);
  color: #ffffff;
}

.badge--sm {
  padding: 0.125rem var(--space-sm);
  font-size: 0.6875rem;
}

.badge--outline {
  background-color: transparent;
  border: 1px solid var(--color-border-primary);
  color: var(--color-text-primary);
}
```

**Step 5: Add tab classes**

```css
/* Tabs */
.tabs__list {
  display: flex;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--color-border-primary);
}

.tabs__tab {
  padding: var(--space-sm) var(--space-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: var(--transition-colors);
  margin-bottom: -1px;
}

.tabs__tab:hover {
  color: var(--color-text-primary);
}

.tabs__tab--active {
  color: var(--color-brand-primary);
  border-bottom-color: var(--color-brand-primary);
}

.tabs__panel {
  padding: var(--space-xl) 0;
}
```

**Step 6: Add ghost button variant (missing from current btn system)**

```css
.btn--ghost {
  background-color: transparent;
  color: var(--color-text-secondary);
  border-color: transparent;
}

.btn--ghost:hover:not(:disabled) {
  background-color: var(--color-surface-tertiary);
  color: var(--color-text-primary);
}
```

**Step 7: Commit**

```bash
git add frontend/src/templates/default/styles/components.css
git commit -m "feat: add CSS classes for form inputs, dialog, tabs, badge variants, and ghost button"
```

---

### Task 2: Button component

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Test: `frontend/src/components/ui/__tests__/Button.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn.className).toContain('btn');
    expect(btn.className).not.toContain('btn--');
  });

  it('applies variant class', () => {
    render(<Button variant="primary">Submit</Button>);
    expect(screen.getByRole('button').className).toContain('btn--primary');
  });

  it('applies size class', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button').className).toContain('btn--sm');
  });

  it('merges custom className', () => {
    render(<Button className="mt-4">Spaced</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn');
    expect(btn.className).toContain('mt-4');
  });

  it('renders as anchor when as="a"', () => {
    render(<Button as="a" href="/test">Link</Button>);
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link.tagName).toBe('A');
    expect(link.className).toContain('btn');
  });

  it('shows loading state', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('passes through native button props', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Native</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Button.test.tsx`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
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

    const buttonProps = rest as ComponentPropsWithoutRef<'button'>;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cls}
        disabled={loading || buttonProps.disabled}
        {...buttonProps}
      >
        {loading && <span className="btn__spinner" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Button.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Button.tsx frontend/src/components/ui/__tests__/Button.test.tsx
git commit -m "feat: add Button component with variant, size, and polymorphic render"
```

---

### Task 3: Input component

**Files:**
- Create: `frontend/src/components/ui/Input.tsx`
- Test: `frontend/src/components/ui/__tests__/Input.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  it('renders with default class', () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId('input').className).toContain('input');
  });

  it('applies inline variant', () => {
    render(<Input variant="inline" data-testid="input" />);
    expect(screen.getByTestId('input').className).toContain('input--inline');
  });

  it('applies error class', () => {
    render(<Input error data-testid="input" />);
    expect(screen.getByTestId('input').className).toContain('input--error');
  });

  it('merges custom className', () => {
    render(<Input className="w-1/2" data-testid="input" />);
    const el = screen.getByTestId('input');
    expect(el.className).toContain('input');
    expect(el.className).toContain('w-1/2');
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement | null>;
    render(<Input ref={ref} data-testid="input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('passes through native props', () => {
    render(<Input type="email" placeholder="Email" data-testid="input" />);
    const el = screen.getByTestId('input') as HTMLInputElement;
    expect(el.type).toBe('email');
    expect(el.placeholder).toBe('Email');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Input.test.tsx`

**Step 3: Write implementation**

```typescript
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
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Input.tsx frontend/src/components/ui/__tests__/Input.test.tsx
git commit -m "feat: add Input component with inline variant and error state"
```

---

### Task 4: Textarea component

**Files:**
- Create: `frontend/src/components/ui/Textarea.tsx`
- Test: `frontend/src/components/ui/__tests__/Textarea.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../Textarea';

describe('Textarea', () => {
  it('renders with default class', () => {
    render(<Textarea data-testid="ta" />);
    expect(screen.getByTestId('ta').className).toContain('textarea');
  });

  it('applies error class', () => {
    render(<Textarea error data-testid="ta" />);
    expect(screen.getByTestId('ta').className).toContain('textarea--error');
  });

  it('auto-resizes when enabled', async () => {
    render(<Textarea autoResize data-testid="ta" />);
    const ta = screen.getByTestId('ta') as HTMLTextAreaElement;
    await userEvent.type(ta, 'hello');
    expect(ta.style.height).toBeDefined();
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLTextAreaElement | null>;
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```typescript
import { forwardRef, ComponentPropsWithoutRef, useCallback, useRef, useEffect } from 'react';

interface TextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  error?: boolean;
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, autoResize, className, onChange, ...props }, ref) => {
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
    }, [resize]);

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
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Textarea.tsx frontend/src/components/ui/__tests__/Textarea.test.tsx
git commit -m "feat: add Textarea component with auto-resize and error state"
```

---

### Task 5: Select component

**Files:**
- Create: `frontend/src/components/ui/Select.tsx`
- Test: `frontend/src/components/ui/__tests__/Select.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import { Select } from '../Select';

describe('Select', () => {
  it('renders with default class', () => {
    render(
      <Select data-testid="sel">
        <option>A</option>
      </Select>
    );
    expect(screen.getByTestId('sel').className).toContain('select');
  });

  it('applies error class', () => {
    render(
      <Select error data-testid="sel">
        <option>A</option>
      </Select>
    );
    expect(screen.getByTestId('sel').className).toContain('select--error');
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLSelectElement | null>;
    render(
      <Select ref={ref}>
        <option>A</option>
      </Select>
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```typescript
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
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Select.tsx frontend/src/components/ui/__tests__/Select.test.tsx
git commit -m "feat: add Select component with error state"
```

---

### Task 6: Dialog component

**Files:**
- Create: `frontend/src/components/ui/Dialog.tsx`
- Test: `frontend/src/components/ui/__tests__/Dialog.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from '../Dialog';

// Mock HTMLDialogElement methods (jsdom doesn't support them)
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe('Dialog', () => {
  it('renders title when provided', () => {
    render(
      <Dialog open onClose={() => {}}>
        <Dialog.Header title="Confirm" />
        <Dialog.Body>Content</Dialog.Body>
      </Dialog>
    );
    expect(screen.getByText('Confirm')).toBeDefined();
  });

  it('calls onClose on cancel event', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose}>
        <Dialog.Body>Content</Dialog.Body>
      </Dialog>
    );
    const dialog = screen.getByRole('dialog');
    dialog.dispatchEvent(new Event('cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders footer with children', () => {
    render(
      <Dialog open onClose={() => {}}>
        <Dialog.Body>Content</Dialog.Body>
        <Dialog.Footer>
          <button>OK</button>
        </Dialog.Footer>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeDefined();
  });

  it('applies dialog CSS class', () => {
    render(
      <Dialog open onClose={() => {}}>
        <Dialog.Body>Content</Dialog.Body>
      </Dialog>
    );
    expect(screen.getByRole('dialog').className).toContain('dialog');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```typescript
import { useRef, useEffect, ReactNode, forwardRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

interface DialogHeaderProps {
  title: string;
}

interface DialogBodyProps {
  children: ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

function DialogHeader({ title }: DialogHeaderProps) {
  return (
    <div className="dialog__header">
      <h3 className="dialog__title">{title}</h3>
    </div>
  );
}

function DialogBody({ children, className }: DialogBodyProps) {
  const classes = ['dialog__body'];
  if (className) classes.push(className);
  return <div className={classes.join(' ')}>{children}</div>;
}

function DialogFooter({ children, className }: DialogFooterProps) {
  const classes = ['dialog__footer'];
  if (className) classes.push(className);
  return <div className={classes.join(' ')}>{children}</div>;
}

const DialogRoot = forwardRef<HTMLDialogElement, DialogProps>(
  ({ open, onClose, className, children }, ref) => {
    const internalRef = useRef<HTMLDialogElement | null>(null);
    const previousFocusRef = useRef<Element | null>(null);

    useEffect(() => {
      const dialog = internalRef.current;
      if (!dialog) return;

      if (open) {
        previousFocusRef.current = document.activeElement;
        dialog.showModal();
      } else {
        dialog.close();
      }

      return () => {
        (previousFocusRef.current as HTMLElement)?.focus?.();
      };
    }, [open]);

    const classes = ['dialog'];
    if (className) classes.push(className);

    return (
      <dialog
        ref={(el) => {
          internalRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        className={classes.join(' ')}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        {children}
      </dialog>
    );
  }
);

DialogRoot.displayName = 'Dialog';

export const Dialog = Object.assign(DialogRoot, {
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
});
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Dialog.tsx frontend/src/components/ui/__tests__/Dialog.test.tsx
git commit -m "feat: add Dialog component with Header, Body, Footer subcomponents"
```

---

### Task 7: FormField component

**Files:**
- Create: `frontend/src/components/ui/FormField.tsx`
- Test: `frontend/src/components/ui/__tests__/FormField.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import { FormField } from '../FormField';

describe('FormField', () => {
  it('renders label', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>
    );
    expect(screen.getByText('Email')).toBeDefined();
  });

  it('renders error message', () => {
    render(
      <FormField label="Email" error="Required">
        <input />
      </FormField>
    );
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('renders required indicator', () => {
    render(
      <FormField label="Email" required>
        <input />
      </FormField>
    );
    expect(screen.getByText('*')).toBeDefined();
  });

  it('renders hint text', () => {
    render(
      <FormField label="Email" hint="We won't share this">
        <input />
      </FormField>
    );
    expect(screen.getByText("We won't share this")).toBeDefined();
  });

  it('renders children', () => {
    render(
      <FormField label="Name">
        <input data-testid="inner" />
      </FormField>
    );
    expect(screen.getByTestId('inner')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```typescript
import { ReactNode } from 'react';

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, error, hint, required, className, children }: FormFieldProps) {
  const classes = ['form-field'];
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      {label && (
        <label className="form-field__label">
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
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/FormField.tsx frontend/src/components/ui/__tests__/FormField.test.tsx
git commit -m "feat: add FormField component with label, error, hint, required"
```

---

### Task 8: Badge component

**Files:**
- Create: `frontend/src/components/ui/Badge.tsx`
- Test: `frontend/src/components/ui/__tests__/Badge.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders with default class', () => {
    render(<Badge>Draft</Badge>);
    expect(screen.getByText('Draft').className).toContain('badge');
  });

  it('applies variant class', () => {
    render(<Badge variant="success">Published</Badge>);
    expect(screen.getByText('Published').className).toContain('badge--success');
  });

  it('applies size class', () => {
    render(<Badge size="sm">Tag</Badge>);
    expect(screen.getByText('Tag').className).toContain('badge--sm');
  });

  it('merges custom className', () => {
    render(<Badge className="ml-2">Label</Badge>);
    const el = screen.getByText('Label');
    expect(el.className).toContain('badge');
    expect(el.className).toContain('ml-2');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```typescript
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
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Badge.tsx frontend/src/components/ui/__tests__/Badge.test.tsx
git commit -m "feat: add Badge component with variant and size props"
```

---

### Task 9: Card component

**Files:**
- Create: `frontend/src/components/ui/Card.tsx`
- Test: `frontend/src/components/ui/__tests__/Card.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('renders with default card class', () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId('card').className).toContain('card');
  });

  it('applies variant class', () => {
    render(<Card variant="draft" data-testid="card">Content</Card>);
    expect(screen.getByTestId('card').className).toContain('card--draft');
  });

  it('applies hoverable class', () => {
    render(<Card hoverable data-testid="card">Content</Card>);
    expect(screen.getByTestId('card').className).toContain('card--hoverable');
  });

  it('renders as anchor when as="a"', () => {
    render(<Card as="a" href="/test" data-testid="card">Link Card</Card>);
    const el = screen.getByTestId('card');
    expect(el.tagName).toBe('A');
    expect(el.className).toContain('card--link');
  });

  it('renders subcomponents', () => {
    render(
      <Card>
        <Card.Body data-testid="body">Body content</Card.Body>
        <Card.Footer data-testid="footer">Footer content</Card.Footer>
      </Card>
    );
    expect(screen.getByTestId('body')).toBeDefined();
    expect(screen.getByTestId('footer')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```typescript
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

function CardBody({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const classes = ['card__body'];
  if (className) classes.push(className);
  return <div className={classes.join(' ')} {...props}>{children}</div>;
}

function CardMedia({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const classes = ['card__media'];
  if (className) classes.push(className);
  return <div className={classes.join(' ')} {...props}>{children}</div>;
}

function CardFooter({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const classes = ['card__footer'];
  if (className) classes.push(className);
  return <div className={classes.join(' ')} {...props}>{children}</div>;
}

function buildCardClassName(variant?: CardVariant, hoverable?: boolean, asAnchor?: boolean, className?: string): string {
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
        <a ref={ref as React.Ref<HTMLAnchorElement>} className={cls} {...anchorProps}>
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
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Card.tsx frontend/src/components/ui/__tests__/Card.test.tsx
git commit -m "feat: add Card component with Body, Media, Footer subcomponents"
```

---

### Task 10: Grid component

**Files:**
- Create: `frontend/src/components/ui/Grid.tsx`
- Test: `frontend/src/components/ui/__tests__/Grid.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import { Grid } from '../Grid';

describe('Grid', () => {
  it('renders with grid class', () => {
    render(<Grid data-testid="grid">Items</Grid>);
    expect(screen.getByTestId('grid').className).toContain('grid');
  });

  it('applies responsive variant', () => {
    render(<Grid variant="responsive" data-testid="grid">Items</Grid>);
    expect(screen.getByTestId('grid').className).toContain('grid--responsive');
  });

  it('applies column variants', () => {
    render(<Grid variant="3-col" data-testid="grid">Items</Grid>);
    expect(screen.getByTestId('grid').className).toContain('grid--3-col');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```typescript
import { forwardRef, ComponentPropsWithoutRef } from 'react';

type GridVariant = 'responsive' | '1-col' | '2-col' | '3-col';

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
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Grid.tsx frontend/src/components/ui/__tests__/Grid.test.tsx
git commit -m "feat: add Grid component with responsive and column variants"
```

---

### Task 11: Tabs component

**Files:**
- Create: `frontend/src/components/ui/Tabs.tsx`
- Test: `frontend/src/components/ui/__tests__/Tabs.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from '../Tabs';

describe('Tabs', () => {
  const renderTabs = (activeTab = 'one', onTabChange = vi.fn()) => {
    return render(
      <Tabs activeTab={activeTab} onTabChange={onTabChange}>
        <Tabs.List>
          <Tabs.Tab value="one">Tab One</Tabs.Tab>
          <Tabs.Tab value="two">Tab Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel One</Tabs.Panel>
        <Tabs.Panel value="two">Panel Two</Tabs.Panel>
      </Tabs>
    );
  };

  it('renders tab buttons', () => {
    renderTabs();
    expect(screen.getByText('Tab One')).toBeDefined();
    expect(screen.getByText('Tab Two')).toBeDefined();
  });

  it('shows active panel', () => {
    renderTabs('one');
    expect(screen.getByText('Panel One')).toBeDefined();
    expect(screen.queryByText('Panel Two')).toBeNull();
  });

  it('applies active class to active tab', () => {
    renderTabs('one');
    expect(screen.getByText('Tab One').className).toContain('tabs__tab--active');
    expect(screen.getByText('Tab Two').className).not.toContain('tabs__tab--active');
  });

  it('calls onTabChange when tab clicked', async () => {
    const onTabChange = vi.fn();
    renderTabs('one', onTabChange);
    await userEvent.click(screen.getByText('Tab Two'));
    expect(onTabChange).toHaveBeenCalledWith('two');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```typescript
import { createContext, useContext, ReactNode } from 'react';

interface TabsContextValue {
  activeTab: string;
  onTabChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs subcomponents must be used within <Tabs>');
  return ctx;
}

interface TabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}

interface TabsListProps {
  className?: string;
  children: ReactNode;
}

interface TabsTabProps {
  value: string;
  className?: string;
  children: ReactNode;
}

interface TabsPanelProps {
  value: string;
  className?: string;
  children: ReactNode;
}

function TabsRoot({ activeTab, onTabChange, className, children }: TabsProps) {
  const classes = ['tabs'];
  if (className) classes.push(className);

  return (
    <TabsContext.Provider value={{ activeTab, onTabChange }}>
      <div className={classes.join(' ')}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children }: TabsListProps) {
  const classes = ['tabs__list'];
  if (className) classes.push(className);
  return <div className={classes.join(' ')} role="tablist">{children}</div>;
}

function TabsTab({ value, className, children }: TabsTabProps) {
  const { activeTab, onTabChange } = useTabsContext();
  const isActive = activeTab === value;

  const classes = ['tabs__tab'];
  if (isActive) classes.push('tabs__tab--active');
  if (className) classes.push(className);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={classes.join(' ')}
      onClick={() => onTabChange(value)}
    >
      {children}
    </button>
  );
}

function TabsPanel({ value, className, children }: TabsPanelProps) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;

  const classes = ['tabs__panel'];
  if (className) classes.push(className);

  return (
    <div role="tabpanel" className={classes.join(' ')}>
      {children}
    </div>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
});
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Tabs.tsx frontend/src/components/ui/__tests__/Tabs.test.tsx
git commit -m "feat: add Tabs component with List, Tab, Panel subcomponents"
```

---

### Task 12: Checkbox component

**Files:**
- Create: `frontend/src/components/ui/Checkbox.tsx`
- Test: `frontend/src/components/ui/__tests__/Checkbox.test.tsx`

**Step 1: Write the test**

```typescript
import { render, screen } from '@testing-library/react';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('renders with checkbox class', () => {
    render(<Checkbox data-testid="cb" />);
    expect(screen.getByTestId('cb').className).toContain('checkbox');
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement | null>;
    render(<Checkbox ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Write implementation**

```typescript
import { forwardRef, ComponentPropsWithoutRef } from 'react';

interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    const classes = ['checkbox'];
    if (className) classes.push(className);

    return <input ref={ref} type="checkbox" className={classes.join(' ')} {...props} />;
  }
);

Checkbox.displayName = 'Checkbox';
```

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Checkbox.tsx frontend/src/components/ui/__tests__/Checkbox.test.tsx
git commit -m "feat: add Checkbox component"
```

---

### Task 13: Barrel export and move existing components

**Files:**
- Create: `frontend/src/components/ui/index.ts`
- Move: `frontend/src/components/EmptyState.tsx` → update to use `Button`
- Move: `frontend/src/components/LoadingSkeletons.tsx` → update to remove hardcoded Tailwind colors

**Step 1: Create barrel export**

```typescript
export { Button } from './Button';
export { Input } from './Input';
export { Textarea } from './Textarea';
export { Select } from './Select';
export { Checkbox } from './Checkbox';
export { Dialog } from './Dialog';
export { FormField } from './FormField';
export { Badge } from './Badge';
export { Card } from './Card';
export { Grid } from './Grid';
export { Tabs } from './Tabs';
```

**Step 2: Update EmptyState to use Button**

In `frontend/src/components/EmptyState.tsx`, replace the raw `className="btn btn--primary mt-4"` with the `Button` component import.

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui';

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
        <Link href={action.href} data-testid="empty-state-action">
          <Button variant="primary" className="mt-4">{action.label}</Button>
        </Link>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/ui/index.ts frontend/src/components/EmptyState.tsx
git commit -m "feat: add barrel export for ui components, update EmptyState to use Button"
```

---

### Task 14: Migrate ConfirmDialog to use Dialog component

**Files:**
- Modify: `frontend/src/components/ConfirmDialog.tsx`

**Step 1: Read current implementation and refactor**

Replace the inline-styled `<dialog>` with the new `Dialog` component. Keep the context/hook API unchanged.

The `ConfirmDialogInner` function should use:
```typescript
import { Dialog } from '@/components/ui';
import { Button } from '@/components/ui';
```

Replace lines 92-132 (the `<dialog>` element and its contents) with:
```typescript
<Dialog open={true} onClose={onCancel}>
  <Dialog.Body>
    <h3 className="dialog__title">{title}</h3>
    <p className="text-sm mb-xl" style={{ color: 'var(--color-text-secondary)' }}>
      {message}
    </p>
  </Dialog.Body>
  <Dialog.Footer>
    <Button
      ref={cancelRef}
      variant="secondary"
      size="sm"
      onClick={onCancel}
      data-testid="confirm-cancel"
    >
      {cancelLabel}
    </Button>
    <Button
      variant={destructive ? 'danger' : 'primary'}
      size="sm"
      onClick={onConfirm}
      data-testid="confirm-ok"
    >
      {confirmLabel}
    </Button>
  </Dialog.Footer>
</Dialog>
```

Remove the inline `style` objects entirely — all styling now comes from `.dialog` CSS class.

**Step 2: Run existing tests to verify nothing breaks**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add frontend/src/components/ConfirmDialog.tsx
git commit -m "refactor: migrate ConfirmDialog to use Dialog and Button components"
```

---

### Task 15: Migrate AltTextDialog to use Dialog and Input

**Files:**
- Modify: `frontend/src/modules/editor/components/AltTextDialog.tsx`

Replace the inline-styled `<dialog>`, input, and button elements with `Dialog`, `Input`, and `Button` from `@/components/ui`. Remove all inline `style` objects.

**Step 1: Read and refactor**

**Step 2: Run tests**

**Step 3: Commit**

```bash
git add frontend/src/modules/editor/components/AltTextDialog.tsx
git commit -m "refactor: migrate AltTextDialog to Dialog, Input, Button components"
```

---

### Task 16: Migrate editor forms (StoryEditorForm, ProjectEditorForm, PageEditorForm)

**Files:**
- Modify: `frontend/src/modules/editor/components/StoryEditorForm.tsx`
- Modify: `frontend/src/modules/editor/components/ProjectEditorForm.tsx`
- Modify: `frontend/src/modules/editor/components/PageEditorForm.tsx`

**For each file:**

1. Import `{ Button, Input, Select, Checkbox, Badge, FormField }` from `@/components/ui`
2. Replace all `bg-indigo-600` / `bg-red-600` button classes with `<Button variant="primary">` / `<Button variant="danger">`
3. Replace all `className="mt-1 block w-full rounded-md border-gray-300..."` inputs with `<Input />`
4. Replace all `className="h-4 w-4 rounded border-gray-300 text-indigo-600..."` checkboxes with `<Checkbox />`
5. Replace all inline `style={{ backgroundColor: 'var(--color-status-success)', color: 'white' }}` badges with `<Badge variant="success">`
6. Wrap labeled inputs in `<FormField label="...">`

**Step 1: Migrate StoryEditorForm.tsx**

**Step 2: Migrate ProjectEditorForm.tsx**

**Step 3: Migrate PageEditorForm.tsx**

**Step 4: Run tests**

Run: `cd frontend && npx vitest run`

**Step 5: Commit**

```bash
git add frontend/src/modules/editor/components/StoryEditorForm.tsx \
       frontend/src/modules/editor/components/ProjectEditorForm.tsx \
       frontend/src/modules/editor/components/PageEditorForm.tsx
git commit -m "refactor: migrate editor forms to ui components, remove inline Tailwind colors"
```

---

### Task 17: Migrate engagement components (CommentThread, CommentSection)

**Files:**
- Modify: `frontend/src/modules/engagement/components/CommentThread.tsx`
- Modify: `frontend/src/modules/engagement/components/CommentSection.tsx`

1. Replace inline-styled textareas with `<Textarea />`
2. Replace `bg-blue-600` buttons with `<Button variant="primary">`
3. Remove all inline `style` objects for `backgroundColor`, `borderColor`, `color`

**Step 1: Migrate both files**

**Step 2: Run tests**

**Step 3: Commit**

```bash
git add frontend/src/modules/engagement/components/CommentThread.tsx \
       frontend/src/modules/engagement/components/CommentSection.tsx
git commit -m "refactor: migrate comment components to Textarea and Button"
```

---

### Task 18: Migrate resume forms

**Files:**
- Modify: `frontend/src/modules/resume/components/ContactForm.tsx`
- Modify: `frontend/src/modules/resume/components/WorkExperienceForm.tsx`
- Modify: `frontend/src/modules/resume/components/EducationForm.tsx`
- Modify: `frontend/src/modules/resume/components/SkillsForm.tsx`
- Modify: `frontend/src/modules/resume/components/AchievementsForm.tsx`
- Delete: `frontend/src/modules/resume/shared.ts` (after all `inlineInput` usages removed)

1. Replace all `${inlineInput}` usages with `<Input variant="inline" />`
2. Replace badge patterns in SkillsForm with `<Badge variant="outline">`
3. Delete `shared.ts` once no imports remain

**Step 1: Migrate all five forms**

**Step 2: Verify `shared.ts` has no remaining importers, delete it**

Run: `grep -r "from.*shared" frontend/src/modules/resume/`

**Step 3: Run tests**

**Step 4: Commit**

```bash
git add frontend/src/modules/resume/components/
git rm frontend/src/modules/resume/shared.ts
git commit -m "refactor: migrate resume forms to Input component, delete shared.ts"
```

---

### Task 19: Migrate admin pages (sections.tsx, tailor.tsx, index.tsx)

**Files:**
- Modify: `frontend/src/pages/admin/sections.tsx`
- Modify: `frontend/src/pages/admin/tailor.tsx`
- Modify: `frontend/src/pages/admin/index.tsx`

**sections.tsx:**
1. Replace `bg-green-600`, `bg-indigo-600`, `bg-red-600` buttons with `<Button variant="primary">`, `<Button variant="danger">`
2. Replace `border-gray-300 dark:border-gray-600` inputs/selects with `<Input />`, `<Select />`
3. Wrap labeled fields in `<FormField>`

**tailor.tsx:**
1. Replace inline-styled tab navigation with `<Tabs>` component
2. Replace inline-styled textareas with `<Textarea />`
3. Replace inline-styled buttons with `<Button>`
4. Replace inline-styled inputs with `<Input />`
5. Replace inline-styled selects with `<Select />`

**index.tsx:**
1. Replace any ad-hoc tab implementation with `<Tabs>` component

**Step 1: Migrate sections.tsx**

**Step 2: Migrate tailor.tsx**

**Step 3: Migrate index.tsx**

**Step 4: Run tests**

**Step 5: Commit**

```bash
git add frontend/src/pages/admin/sections.tsx \
       frontend/src/pages/admin/tailor.tsx \
       frontend/src/pages/admin/index.tsx
git commit -m "refactor: migrate admin pages to ui components, replace all hardcoded colors"
```

---

### Task 20: Migrate ImageBubbleMenu

**Files:**
- Modify: `frontend/src/modules/editor/components/ImageBubbleMenu.tsx`

1. Replace inline-styled input with `<Input />`
2. Replace inline-styled width-preset buttons with `<Button variant="ghost">` with active state

**Step 1: Migrate**

**Step 2: Run tests**

**Step 3: Commit**

```bash
git add frontend/src/modules/editor/components/ImageBubbleMenu.tsx
git commit -m "refactor: migrate ImageBubbleMenu to Input and Button components"
```

---

### Task 21: Update docs-site plan and _meta.ts

**Files:**
- Modify: `docs-site/pages/plans/_meta.ts`

**Step 1: Add plan entry**

Add `'2026-03-22-ui-component-library': 'UI Component Library'` to the `_meta.ts` file at the top of the list.

**Step 2: Commit**

```bash
git add docs-site/pages/plans/2026-03-22-ui-component-library.md docs-site/pages/plans/_meta.ts
git commit -m "docs: add UI component library design plan"
```

---

### Task 22: Final verification

**Step 1: Run full lint**

```bash
cd frontend && npm run lint
```

**Step 2: Run full test suite**

```bash
make test-frontend-unit
```

**Step 3: Run format**

```bash
make format
```

**Step 4: Grep for remaining hardcoded color classes**

Search for any remaining `bg-indigo-600`, `bg-blue-600`, `bg-red-600`, `bg-green-600` in `.tsx` files that should have been migrated. Loading animations and skeletons may keep some Tailwind grays for animation — that's acceptable as those are structural, not brand colors.

```bash
grep -r "bg-indigo-600\|bg-blue-600\|bg-red-600\|bg-green-600" frontend/src/ --include="*.tsx"
```

**Step 5: Fix any remaining issues and commit**

**Step 6: Grep for remaining inline style objects using CSS variables**

```bash
grep -r "backgroundColor: 'var(--color" frontend/src/ --include="*.tsx"
```

Remaining hits should only be in components where dynamic conditional styling genuinely requires inline styles (e.g., `ImageBubbleMenu` active state toggles). All static styling should use CSS classes.
