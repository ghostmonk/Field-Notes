import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AchievementsForm } from './AchievementsForm';

afterEach(cleanup);

describe('AchievementsForm', () => {
  it('renders existing achievements as inputs', () => {
    const onChange = vi.fn();
    render(
      <AchievementsForm
        achievements={['Led migration', 'Reduced latency by 50%']}
        onChange={onChange}
      />
    );

    expect(screen.getByDisplayValue('Led migration')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Reduced latency by 50%')).toBeInTheDocument();
  });

  it('has button to add new achievement', () => {
    const onChange = vi.fn();
    render(<AchievementsForm achievements={[]} onChange={onChange} />);

    const addButton = screen.getByText('+ Add');
    fireEvent.click(addButton);

    expect(onChange).toHaveBeenCalledWith(['']);
  });

  it('calls onChange when achievement removed', () => {
    const onChange = vi.fn();
    render(
      <AchievementsForm
        achievements={['First', 'Second', 'Third']}
        onChange={onChange}
      />
    );

    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[1]);

    expect(onChange).toHaveBeenCalledWith(['First', 'Third']);
  });

  it('calls onChange when achievement text updated', () => {
    const onChange = vi.fn();
    render(
      <AchievementsForm achievements={['Original']} onChange={onChange} />
    );

    fireEvent.change(screen.getByDisplayValue('Original'), {
      target: { value: 'Updated' },
    });

    expect(onChange).toHaveBeenCalledWith(['Updated']);
  });
});
