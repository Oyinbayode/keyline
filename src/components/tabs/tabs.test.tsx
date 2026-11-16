import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { TabsRootProps } from './tabs';
import { Tabs } from './tabs';

interface ExampleProps extends Omit<TabsRootProps, 'children'> {
  disabled?: string[];
  tabs?: string[];
  keepMounted?: boolean;
}

function Example({
  disabled = [],
  tabs = ['Account', 'Password', 'Billing'],
  keepMounted,
  ...rootProps
}: ExampleProps) {
  return (
    <Tabs.Root {...rootProps}>
      <Tabs.List aria-label="Settings">
        {tabs.map((name) => (
          <Tabs.Tab key={name} value={name.toLowerCase()} disabled={disabled.includes(name)}>
            {name}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {tabs.map((name) => (
        <Tabs.Panel key={name} value={name.toLowerCase()} keepMounted={keepMounted}>
          <p>{name} settings</p>
          <input aria-label={`${name} field`} />
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });
const panel = (name: string) => screen.getByRole('tabpanel', { name });
const selectedTab = () => screen.getByRole('tab', { selected: true });

async function pressOn(name: string, keys: string) {
  const user = userEvent.setup();
  tab(name).focus();
  await user.keyboard(keys);
}

describe('Tabs', () => {
  describe('semantics', () => {
    it('renders a tablist of button tabs, each controlling a labelled panel', () => {
      render(<Example defaultValue="account" />);
      const list = screen.getByRole('tablist', { name: 'Settings' });
      const account = tab('Account');

      expect(list).toHaveAttribute('aria-orientation', 'horizontal');
      expect(account.tagName).toBe('BUTTON');
      expect(account).toHaveAttribute('type', 'button');
      expect(account).toHaveAttribute('aria-selected', 'true');
      expect(tab('Password')).toHaveAttribute('aria-selected', 'false');
      expect(account).toHaveAttribute('aria-controls', panel('Account').id);
      expect(panel('Account')).toHaveAttribute('aria-labelledby', account.id);
    });

    it('gives only the selected tab a tab stop, and makes the panel one', () => {
      render(<Example defaultValue="password" />);

      expect(tab('Account')).toHaveAttribute('tabindex', '-1');
      expect(tab('Password')).toHaveAttribute('tabindex', '0');
      expect(tab('Billing')).toHaveAttribute('tabindex', '-1');
      expect(panel('Password')).toHaveAttribute('tabindex', '0');
    });

    it('hides inactive panels from everyone, assistive technology included', () => {
      render(<Example defaultValue="account" />);

      expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
      const hiddenPanels = screen.getAllByRole('tabpanel', { hidden: true }).slice(1);
      for (const hiddenPanel of hiddenPanels) {
        expect(hiddenPanel).not.toBeVisible();
        expect(hiddenPanel).toHaveAttribute('hidden');
        expect(hiddenPanel).toBeEmptyDOMElement();
      }
    });

    it('keeps inactive panel content mounted, still hidden, with keepMounted', () => {
      render(<Example defaultValue="account" keepMounted />);

      const billing = document.getElementById(tab('Billing').getAttribute('aria-controls') ?? '');
      expect(billing).not.toBeVisible();
      expect(billing).toHaveTextContent('Billing settings');
    });

    it('exposes state and orientation as data attributes', () => {
      render(<Example defaultValue="account" orientation="vertical" disabled={['Billing']} />);

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
      expect(screen.getByRole('tablist')).toHaveAttribute('data-orientation', 'vertical');
      expect(tab('Account')).toHaveAttribute('data-state', 'active');
      expect(tab('Password')).toHaveAttribute('data-state', 'inactive');
      expect(tab('Billing')).toHaveAttribute('data-disabled', '');
      expect(panel('Account')).toHaveAttribute('data-state', 'active');
      expect(panel('Account')).toHaveAttribute('data-orientation', 'vertical');
    });

    it('builds valid ids from values that contain spaces', () => {
      render(
        <Tabs.Root defaultValue="two words">
          <Tabs.List aria-label="Spaces">
            <Tabs.Tab value="two words">Two words</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="two words">Content</Tabs.Panel>
        </Tabs.Root>,
      );

      expect(tab('Two words').id).not.toMatch(/\s/);
      expect(panel('Two words')).toBeInTheDocument();
    });

    it('warns in development when the tab list has no accessible name', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Tab value="a">A</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>,
      );

      expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('no accessible name'));
    });

    it('does not warn when the list is labelled by a heading', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <Tabs.Root defaultValue="a">
          <h2 id="heading">Settings</h2>
          <Tabs.List aria-labelledby="heading">
            <Tabs.Tab value="a">A</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>,
      );

      expect(warn).not.toHaveBeenCalled();
      expect(screen.getByRole('tablist', { name: 'Settings' })).toBeInTheDocument();
    });

    it('throws a helpful error when a part is used outside Tabs.Root', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<Tabs.Tab value="a">A</Tabs.Tab>)).toThrow(
        'Tabs.Tab must be inside Tabs.Root',
      );
    });
  });

  describe('uncontrolled', () => {
    it('selects the first enabled tab when there is no defaultValue', () => {
      render(<Example disabled={['Account']} />);

      expect(selectedTab()).toBe(tab('Password'));
      expect(panel('Password')).toBeVisible();
    });

    it('selects on click and reports the change', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example defaultValue="account" onValueChange={onValueChange} />);

      await user.click(tab('Billing'));

      expect(selectedTab()).toBe(tab('Billing'));
      expect(panel('Billing')).toBeVisible();
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith('billing');
    });

    it('ignores clicks on a disabled tab', async () => {
      const user = userEvent.setup();
      render(<Example defaultValue="account" disabled={['Billing']} />);

      await user.click(tab('Billing'));

      expect(selectedTab()).toBe(tab('Account'));
    });

    it('lets onClick cancel selection with preventDefault', async () => {
      const user = userEvent.setup();
      render(
        <Tabs.Root defaultValue="a">
          <Tabs.List aria-label="Letters">
            <Tabs.Tab value="a">A</Tabs.Tab>
            <Tabs.Tab
              value="b"
              onClick={(event) => {
                event.preventDefault();
              }}
            >
              B
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>,
      );

      await user.click(tab('B'));

      expect(selectedTab()).toBe(tab('A'));
    });
  });

  describe('keyboard, automatic activation', () => {
    it('moves focus and selection together with the arrow keys', async () => {
      render(<Example defaultValue="account" />);

      await pressOn('Account', '{ArrowRight}');
      expect(tab('Password')).toHaveFocus();
      expect(selectedTab()).toBe(tab('Password'));

      await pressOn('Password', '{ArrowLeft}');
      expect(selectedTab()).toBe(tab('Account'));
    });

    it('wraps, and jumps with Home and End', async () => {
      render(<Example defaultValue="account" />);

      await pressOn('Account', '{ArrowLeft}');
      expect(selectedTab()).toBe(tab('Billing'));

      await pressOn('Billing', '{ArrowRight}');
      expect(selectedTab()).toBe(tab('Account'));

      await pressOn('Account', '{End}');
      expect(selectedTab()).toBe(tab('Billing'));

      await pressOn('Billing', '{Home}');
      expect(selectedTab()).toBe(tab('Account'));
    });

    it('skips disabled tabs', async () => {
      render(<Example defaultValue="account" disabled={['Password']} />);

      await pressOn('Account', '{ArrowRight}');

      expect(tab('Billing')).toHaveFocus();
      expect(selectedTab()).toBe(tab('Billing'));
    });

    it('flips Left and Right under dir="rtl"', async () => {
      render(
        <div dir="rtl">
          <Example defaultValue="account" />
        </div>,
      );

      await pressOn('Account', '{ArrowLeft}');
      expect(selectedTab()).toBe(tab('Password'));

      await pressOn('Password', '{ArrowRight}');
      expect(selectedTab()).toBe(tab('Account'));
    });

    it('uses Up and Down, not Left and Right, when vertical', async () => {
      render(<Example defaultValue="account" orientation="vertical" />);

      await pressOn('Account', '{ArrowRight}');
      expect(selectedTab()).toBe(tab('Account'));

      await pressOn('Account', '{ArrowDown}');
      expect(selectedTab()).toBe(tab('Password'));

      await pressOn('Password', '{ArrowUp}');
      expect(selectedTab()).toBe(tab('Account'));
    });
  });

  describe('keyboard, manual activation', () => {
    it('moves focus without selecting until Enter or Space', async () => {
      const onValueChange = vi.fn();
      render(
        <Example defaultValue="account" activationMode="manual" onValueChange={onValueChange} />,
      );

      await pressOn('Account', '{ArrowRight}');
      expect(tab('Password')).toHaveFocus();
      expect(selectedTab()).toBe(tab('Account'));
      expect(onValueChange).not.toHaveBeenCalled();

      await pressOn('Password', '{Enter}');
      expect(selectedTab()).toBe(tab('Password'));

      await pressOn('Password', '{ArrowRight} ');
      expect(selectedTab()).toBe(tab('Billing'));
      expect(onValueChange.mock.calls).toEqual([['password'], ['billing']]);
    });
  });

  describe('tab sequence', () => {
    it('enters the list on the selected tab and leaves it for the panel', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <Example defaultValue="password" />
        </>,
      );

      await user.tab();
      await user.tab();
      expect(tab('Password')).toHaveFocus();

      await user.tab();
      expect(panel('Password')).toHaveFocus();

      await user.tab({ shift: true });
      expect(tab('Password')).toHaveFocus();
    });

    it('returns to the selected tab, not the last focused one, in manual mode', async () => {
      const user = userEvent.setup();
      render(<Example defaultValue="account" activationMode="manual" />);

      await pressOn('Account', '{ArrowRight}');
      await user.tab();
      expect(panel('Account')).toHaveFocus();

      await user.tab({ shift: true });
      expect(tab('Account')).toHaveFocus();
    });
  });

  describe('controlled', () => {
    it('only changes when the parent passes a new value', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Example value="account" onValueChange={onValueChange} />);

      await user.click(tab('Password'));

      expect(onValueChange).toHaveBeenCalledExactlyOnceWith('password');
      expect(selectedTab()).toBe(tab('Account'));
    });

    it('follows parent state', async () => {
      function Parent() {
        const [value, setValue] = useState('account');
        return (
          <>
            <Example value={value} onValueChange={setValue} />
            <output>{value}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);

      await user.click(tab('Billing'));

      expect(selectedTab()).toBe(tab('Billing'));
      expect(screen.getByRole('status')).toHaveTextContent('billing');
    });
  });

  describe('selection fallback', () => {
    it('moves selection to the nearest enabled tab when the selected one is disabled', () => {
      const onValueChange = vi.fn();
      const { rerender } = render(
        <Example defaultValue="password" onValueChange={onValueChange} />,
      );

      rerender(
        <Example defaultValue="password" onValueChange={onValueChange} disabled={['Password']} />,
      );

      expect(selectedTab()).toBe(tab('Billing'));
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith('billing');
    });

    it('selects the tab that takes the removed tab’s place', () => {
      const { rerender } = render(<Example defaultValue="password" />);

      rerender(<Example defaultValue="password" tabs={['Account', 'Billing']} />);

      expect(selectedTab()).toBe(tab('Billing'));
      expect(panel('Billing')).toBeVisible();
    });

    it('selects the previous tab when the last one is removed', () => {
      const { rerender } = render(<Example defaultValue="billing" />);

      rerender(<Example defaultValue="billing" tabs={['Account', 'Password']} />);

      expect(selectedTab()).toBe(tab('Password'));
    });

    it('skips disabled neighbours when falling back', () => {
      const { rerender } = render(<Example defaultValue="password" disabled={['Billing']} />);

      rerender(<Example defaultValue="password" disabled={['Billing', 'Password']} />);

      expect(selectedTab()).toBe(tab('Account'));
    });

    it('asks a controlled parent to change rather than changing itself', () => {
      const onValueChange = vi.fn();
      const { rerender } = render(<Example value="password" onValueChange={onValueChange} />);

      rerender(<Example value="password" onValueChange={onValueChange} disabled={['Password']} />);

      expect(onValueChange).toHaveBeenCalledWith('billing');
      expect(selectedTab()).toBe(tab('Password'));
    });
  });

  describe('composition', () => {
    it('forwards refs, className, and other props to each part', () => {
      const rootRef = createRef<HTMLDivElement>();
      const listRef = createRef<HTMLDivElement>();
      const tabRef = createRef<HTMLButtonElement>();
      const panelRef = createRef<HTMLDivElement>();
      render(
        <Tabs.Root ref={rootRef} defaultValue="a" className="root" data-testid="root">
          <Tabs.List ref={listRef} aria-label="Letters" className="list">
            <Tabs.Tab ref={tabRef} value="a" className="tab" style={{ marginInlineEnd: 4 }}>
              A
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel ref={panelRef} value="a" className="panel">
            Content
          </Tabs.Panel>
        </Tabs.Root>,
      );

      expect(rootRef.current).toBe(screen.getByTestId('root'));
      expect(rootRef.current).toHaveClass('kl-tabs', 'root');
      expect(listRef.current).toBe(screen.getByRole('tablist'));
      expect(listRef.current).toHaveClass('kl-tabs-list', 'list');
      expect(tabRef.current).toBe(tab('A'));
      expect(tabRef.current).toHaveClass('kl-tabs-tab', 'tab');
      expect(tabRef.current).toHaveStyle({ marginInlineEnd: '4px' });
      expect(panelRef.current).toBe(panel('A'));
      expect(panelRef.current).toHaveClass('kl-tabs-panel', 'panel');
    });

    it('lets a panel opt out of the tab sequence when its content is focusable', () => {
      render(
        <Tabs.Root defaultValue="a">
          <Tabs.List aria-label="Letters">
            <Tabs.Tab value="a">A</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a" tabIndex={-1}>
            <input aria-label="Name" />
          </Tabs.Panel>
        </Tabs.Root>,
      );

      expect(panel('A')).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('axe', () => {
    it.each<[string, ExampleProps]>([
      ['horizontal', { defaultValue: 'account' }],
      ['vertical', { defaultValue: 'account', orientation: 'vertical' }],
      ['with a disabled tab', { defaultValue: 'account', disabled: ['Password'] }],
      ['in manual mode', { defaultValue: 'billing', activationMode: 'manual' }],
      ['with panels kept mounted', { defaultValue: 'password', keepMounted: true }],
    ])('has no violations when %s', async (_, props) => {
      const { container } = render(<Example {...props} />);

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

describe('Tabs without a process global', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('imports and renders instead of throwing', async () => {
    vi.stubGlobal('process', undefined);

    const { Tabs: UnbundledTabs } = await import('./tabs');
    render(
      <UnbundledTabs.Root defaultValue="a">
        <UnbundledTabs.List aria-label="Letters">
          <UnbundledTabs.Tab value="a">A</UnbundledTabs.Tab>
        </UnbundledTabs.List>
      </UnbundledTabs.Root>,
    );

    expect(tab('A')).toBeInTheDocument();
  });
});
