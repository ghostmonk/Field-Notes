import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from '../Tabs';

describe('Tabs', () => {
  const renderTabs = (activeTab = 'one', onTabChange = vi.fn()) => {
    return {
      onTabChange,
      ...render(
        <Tabs activeTab={activeTab} onTabChange={onTabChange}>
          <Tabs.List>
            <Tabs.Tab value="one">Tab One</Tabs.Tab>
            <Tabs.Tab value="two">Tab Two</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel One</Tabs.Panel>
          <Tabs.Panel value="two">Panel Two</Tabs.Panel>
        </Tabs>
      ),
    };
  };

  it('renders tab buttons', () => {
    renderTabs();
    expect(screen.getByText('Tab One')).toBeDefined();
    expect(screen.getByText('Tab Two')).toBeDefined();
  });

  it('shows active panel only', () => {
    renderTabs('one');
    expect(screen.getByText('Panel One')).toBeDefined();
    expect(screen.queryByText('Panel Two')).toBeNull();
  });

  it('applies active class to active tab', () => {
    renderTabs('one');
    expect(screen.getByText('Tab One').className).toContain('tabs__tab--active');
    expect(screen.getByText('Tab Two').className).not.toContain(
      'tabs__tab--active'
    );
  });

  it('calls onTabChange when tab clicked', async () => {
    const onTabChange = vi.fn();
    renderTabs('one', onTabChange);
    await userEvent.click(screen.getByText('Tab Two'));
    expect(onTabChange).toHaveBeenCalledWith('two');
  });

  it('sets aria-selected on active tab', () => {
    renderTabs('one');
    expect(screen.getByText('Tab One').getAttribute('aria-selected')).toBe(
      'true'
    );
    expect(screen.getByText('Tab Two').getAttribute('aria-selected')).toBe(
      'false'
    );
  });
});
