import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../Textarea';

describe("Textarea", () => {
  it("renders with default class", () => {
    render(<Textarea data-testid="ta" />);
    expect(screen.getByTestId("ta").className).toContain("textarea");
  });

  it("applies error class", () => {
    render(<Textarea error data-testid="ta" />);
    expect(screen.getByTestId("ta").className).toContain("textarea--error");
  });

  it("merges custom className", () => {
    render(<Textarea className="h-32" data-testid="ta" />);
    const el = screen.getByTestId("ta");
    expect(el.className).toContain("textarea");
    expect(el.className).toContain("h-32");
  });

  it("forwards ref", () => {
    const ref = {
      current: null,
    } as React.RefObject<HTMLTextAreaElement | null>;
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("calls onChange handler", async () => {
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} data-testid="ta" />);
    await userEvent.type(screen.getByTestId("ta"), "hello");
    expect(onChange).toHaveBeenCalled();
  });
});
