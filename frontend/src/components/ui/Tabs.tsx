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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    );
    const current = tabs.indexOf(e.target as HTMLButtonElement);
    if (current === -1) return;

    let next = -1;
    if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;

    if (next !== -1) {
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    }
  };

  return (
    <div className={classes.join(' ')} role="tablist" onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

function TabsTab({ value, className, children }: TabsTabProps) {
  const { activeTab, onTabChange } = useTabsContext();
  const isActive = activeTab === value;
  const tabId = `tab-${value}`;
  const panelId = `tabpanel-${value}`;

  const classes = ['tabs__tab'];
  if (isActive) classes.push('tabs__tab--active');
  if (className) classes.push(className);

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      tabIndex={isActive ? 0 : -1}
      aria-selected={isActive}
      aria-controls={panelId}
      className={classes.join(' ')}
      onClick={() => onTabChange(value)}
    >
      {children}
    </button>
  );
}

function TabsPanel({ value, className, children }: TabsPanelProps) {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;
  const tabId = `tab-${value}`;
  const panelId = `tabpanel-${value}`;

  const classes = ['tabs__panel'];
  if (className) classes.push(className);

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      hidden={!isActive}
      className={classes.join(' ')}
    >
      {children}
    </div>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
});
