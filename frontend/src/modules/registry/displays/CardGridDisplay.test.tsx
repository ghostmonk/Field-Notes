import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CardGridDisplay } from './CardGridDisplay';

afterEach(cleanup);

function makeItems(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `item-${i}`);
}

describe('CardGridDisplay', () => {
  it('renders items using renderItem', () => {
    const items = ['alpha', 'beta', 'gamma'];
    render(
      <CardGridDisplay
        items={items}
        renderItem={(item) => <div data-testid={`rendered-${item}`}>{item}</div>}
      />
    );

    expect(screen.getByTestId('rendered-alpha')).toBeInTheDocument();
    expect(screen.getByTestId('rendered-beta')).toBeInTheDocument();
    expect(screen.getByTestId('rendered-gamma')).toBeInTheDocument();
  });

  it('shows Show More button when items exceed PAGE_SIZE (12)', () => {
    const items = makeItems(15);
    render(
      <CardGridDisplay
        items={items}
        renderItem={(item) => <div>{item}</div>}
      />
    );

    const button = screen.getByTestId('show-more-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('3 remaining');
  });

  it('hides Show More when all items visible', () => {
    const items = makeItems(10);
    render(
      <CardGridDisplay
        items={items}
        renderItem={(item) => <div>{item}</div>}
      />
    );

    expect(screen.queryByTestId('show-more-button')).not.toBeInTheDocument();
  });

  it('clicking Show More reveals more items', () => {
    const items = makeItems(15);
    render(
      <CardGridDisplay
        items={items}
        renderItem={(item) => <div>{item}</div>}
      />
    );

    expect(screen.queryByText('item-12')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('show-more-button'));

    expect(screen.getByText('item-12')).toBeInTheDocument();
    expect(screen.getByText('item-14')).toBeInTheDocument();
    expect(screen.queryByTestId('show-more-button')).not.toBeInTheDocument();
  });
});
