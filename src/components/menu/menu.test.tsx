import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { isPopoverOpen, lightDismiss, stubPopover } from '../../../tests/stub-popover';
import type { MenuItemProps, MenuRootProps } from './menu';
import { Menu } from './menu';

stubPopover();

interface ExampleProps extends Omit<MenuRootProps, 'children'> {
  onSelect?: MenuItemProps['onSelect'];
  onCopy?: () => void;
}

function Example({ onSelect, onCopy, ...rootProps }: ExampleProps) {
  return (
    <>
      <button type="button">Before</button>
      <Menu.Root {...rootProps}>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item shortcut="Ctrl+N" onSelect={onSelect}>
            New file
          </Menu.Item>
          <Menu.Item>New window</Menu.Item>
          <Menu.Item onSelect={onCopy}>Copy</Menu.Item>
          <Menu.Item disabled onSelect={onSelect}>
            Save
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item>Duplicate</Menu.Item>
          <Menu.Item>Delete</Menu.Item>
        </Menu.Content>
      </Menu.Root>
      <button type="button">After</button>
    </>
  );
}

function OptionsExample({ onWrapChange }: { onWrapChange?: (checked: boolean) => void }) {
  const [wrap, setWrap] = useState(false);
  const [size, setSize] = useState('medium');
  return (
    <Menu.Root defaultOpen>
      <Menu.Trigger>Format</Menu.Trigger>
      <Menu.Content>
        <Menu.CheckboxItem
          checked={wrap}
          onCheckedChange={(checked) => {
            onWrapChange?.(checked);
            setWrap(checked);
          }}
        >
          Wrap lines
        </Menu.CheckboxItem>
        <Menu.CheckboxItem checked>Show ruler</Menu.CheckboxItem>
        <Menu.Separator />
        <Menu.RadioGroup value={size} onValueChange={setSize}>
          <Menu.Label>Text size</Menu.Label>
          <Menu.RadioItem value="small">Small</Menu.RadioItem>
          <Menu.RadioItem value="medium">Medium</Menu.RadioItem>
          <Menu.RadioItem value="large" disabled>
            Large
          </Menu.RadioItem>
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

const trigger = (name = 'Actions') => screen.getByRole('button', { name });
const menu = () => screen.getByRole('menu', { hidden: true });
const item = (name: string) => screen.getByRole('menuitem', { name });

async function openWith(keys: string, name = 'Actions') {
  const user = userEvent.setup();
  trigger(name).focus();
  await user.keyboard(keys);
  return user;
}

describe('Menu', () => {
  describe('semantics', () => {
    it('wires the trigger to a menu labelled by it', async () => {
      render(<Example />);
      const button = trigger();

      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).not.toHaveAttribute('aria-controls');

      await openWith('{Enter}');

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', menu().id);
      expect(screen.getByRole('menu', { name: 'Actions' })).toBe(menu());
      expect(menu()).toHaveAttribute('popover', 'auto');
    });

    it('keeps the closed menu out of the accessibility tree', () => {
      render(<Example />);

      expect(screen.queryByRole('menu')).toBeNull();
      expect(screen.queryByRole('menuitem')).toBeNull();
      expect(isPopoverOpen(menu())).toBe(false);
    });

    it('renders items that take focus by script only', async () => {
      render(<Example />);
      await openWith('{Enter}');

      for (const menuItem of screen.getAllByRole('menuitem')) {
        expect(menuItem).toHaveAttribute('tabindex', '-1');
      }
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    it('marks disabled items with aria-disabled and keeps them focusable', async () => {
      render(<Example />);
      await openWith('{Enter}');

      const save = item('Save');
      expect(save).toHaveAttribute('aria-disabled', 'true');
      expect(save).not.toHaveAttribute('disabled');
      save.focus();
      expect(save).toHaveFocus();
    });

    it('reads the shortcut as the item description, and keeps it out of the name', async () => {
      render(<Example />);
      await openWith('{Enter}');

      expect(item('New file')).toHaveAccessibleDescription('Ctrl+N');
      expect(item('New window')).not.toHaveAttribute('aria-describedby');
    });

    it('exposes checkbox and radio state, with a hidden indicator', () => {
      render(<OptionsExample />);

      const wrap = screen.getByRole('menuitemcheckbox', { name: 'Wrap lines' });
      expect(wrap).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('menuitemcheckbox', { name: 'Show ruler' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(screen.getByRole('menuitemradio', { name: 'Medium' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(screen.getByRole('menuitemradio', { name: 'Small' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      expect(wrap.querySelector('.kl-menu-indicator')).toHaveAttribute('aria-hidden', 'true');
    });

    it('labels a group by its Menu.Label', () => {
      render(<OptionsExample />);

      const group = screen.getByRole('group', { name: 'Text size' });
      expect(group).toContainElement(screen.getByRole('menuitemradio', { name: 'Small' }));
    });

    it('leaves a group without a label unlabelled rather than pointing at nothing', () => {
      render(
        <Menu.Root defaultOpen>
          <Menu.Trigger>Menu</Menu.Trigger>
          <Menu.Content>
            <Menu.Group aria-label="Share">
              <Menu.Item>Copy link</Menu.Item>
            </Menu.Group>
          </Menu.Content>
        </Menu.Root>,
      );

      expect(screen.getByRole('group', { name: 'Share' })).not.toHaveAttribute('aria-labelledby');
    });

    it('passes props, class names and refs through to each part', () => {
      const contentRef = createRef<HTMLDivElement>();
      const itemRef = createRef<HTMLDivElement>();
      render(
        <Menu.Root defaultOpen>
          <Menu.Trigger className="trigger" data-testid="trigger">
            Menu
          </Menu.Trigger>
          <Menu.Content ref={contentRef} className="custom" data-testid="content">
            <Menu.Item ref={itemRef} className="row">
              One
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>,
      );

      expect(screen.getByTestId('trigger')).toHaveClass('trigger');
      expect(contentRef.current).toBe(screen.getByTestId('content'));
      expect(contentRef.current).toHaveClass('kl-menu', 'custom');
      expect(itemRef.current).toHaveClass('kl-menu-item', 'row');
    });

    it('throws a clear error when a part is used outside Menu.Root', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<Menu.Trigger>Orphan</Menu.Trigger>)).toThrow(
        'Menu.Trigger must be inside Menu.Root',
      );
      expect(() =>
        render(
          <Menu.Root>
            <Menu.RadioItem value="a">A</Menu.RadioItem>
          </Menu.Root>,
        ),
      ).toThrow('Menu.RadioItem must be inside Menu.RadioGroup');
    });
  });

  describe('opening from the trigger', () => {
    it.each([
      ['Enter', '{Enter}'],
      ['Space', ' '],
      ['Down Arrow', '{ArrowDown}'],
    ])('%s opens the menu and focuses the first item', async (_, keys) => {
      render(<Example />);

      await openWith(keys);

      expect(isPopoverOpen(menu())).toBe(true);
      expect(item('New file')).toHaveFocus();
    });

    it('Up Arrow opens the menu and focuses the last item', async () => {
      render(<Example />);

      await openWith('{ArrowUp}');

      expect(item('Delete')).toHaveFocus();
    });

    it('a click opens it and focuses the first item; a second click closes it', async () => {
      const onOpenChange = vi.fn();
      render(<Example onOpenChange={onOpenChange} />);
      const user = userEvent.setup();

      await user.click(trigger());
      expect(item('New file')).toHaveFocus();

      await user.click(trigger());
      expect(isPopoverOpen(menu())).toBe(false);
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it('a trigger onClick that calls preventDefault keeps the menu closed', async () => {
      render(
        <Menu.Root>
          <Menu.Trigger
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            Locked
          </Menu.Trigger>
          <Menu.Content>
            <Menu.Item>One</Menu.Item>
          </Menu.Content>
        </Menu.Root>,
      );

      await userEvent.setup().click(trigger('Locked'));

      expect(trigger('Locked')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('keyboard in the menu', () => {
    it('Down and Up move one item at a time, onto disabled items too, and wrap', async () => {
      render(<Example />);
      const user = await openWith('{Enter}');

      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
      expect(item('Save')).toHaveFocus();
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
      expect(item('New file')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(item('Delete')).toHaveFocus();
    });

    it('Home and End go to the first and last items', async () => {
      render(<Example />);
      const user = await openWith('{Enter}');

      await user.keyboard('{End}');
      expect(item('Delete')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(item('New file')).toHaveFocus();
    });

    it('typeahead moves to the next item starting with the typed text', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<Example />);
      const user = await openWith('{Enter}');

      await user.keyboard('c');
      expect(item('Copy')).toHaveFocus();
      // Typed straight after, "cd" would match nothing; after the timeout it is a new search.
      await user.keyboard('d');
      expect(item('Copy')).toHaveFocus();
      vi.advanceTimersByTime(600);
      await user.keyboard('d');
      expect(item('Duplicate')).toHaveFocus();
      vi.useRealTimers();
    });

    it('typeahead cycles on a repeated letter, and Space is part of a search in progress', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<Example />);
      const user = await openWith('{Enter}');

      await user.keyboard('dd');
      expect(item('Delete')).toHaveFocus();
      vi.advanceTimersByTime(600);

      await user.keyboard('new w');
      expect(item('New window')).toHaveFocus();
      expect(isPopoverOpen(menu())).toBe(true);
      vi.useRealTimers();
    });

    it('Esc closes the menu and returns focus to the trigger', async () => {
      render(<Example />);
      const user = await openWith('{Enter}');

      await user.keyboard('{Escape}');

      expect(isPopoverOpen(menu())).toBe(false);
      expect(trigger()).toHaveFocus();
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('Tab closes the menu and lets focus move on past the trigger', async () => {
      render(<Example />);
      const user = await openWith('{Enter}');

      await user.keyboard('{Tab}');

      expect(isPopoverOpen(menu())).toBe(false);
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('a keydown handler that calls preventDefault takes over', async () => {
      render(
        <Menu.Root>
          <Menu.Trigger>Menu</Menu.Trigger>
          <Menu.Content
            onKeyDown={(event) => {
              event.preventDefault();
            }}
          >
            <Menu.Item>One</Menu.Item>
            <Menu.Item>Two</Menu.Item>
          </Menu.Content>
        </Menu.Root>,
      );
      const user = await openWith('{Enter}', 'Menu');

      await user.keyboard('{ArrowDown}{Escape}');

      expect(item('One')).toHaveFocus();
    });
  });

  describe('activation', () => {
    it.each([
      ['Enter', '{Enter}'],
      ['Space', ' '],
    ])('%s activates the item, closes the menu and returns focus', async (_, keys) => {
      const onCopy = vi.fn();
      render(<Example onCopy={onCopy} />);
      // Arrows, not typeahead: Space straight after a typed letter would extend the search.
      const user = await openWith('{Enter}');
      await user.keyboard('{ArrowDown}{ArrowDown}');

      await user.keyboard(keys);

      expect(onCopy).toHaveBeenCalledOnce();
      expect(isPopoverOpen(menu())).toBe(false);
      expect(trigger()).toHaveFocus();
    });

    it('a click activates the item', async () => {
      const onCopy = vi.fn();
      render(<Example onCopy={onCopy} />);
      const user = userEvent.setup();
      await user.click(trigger());

      await user.click(item('Copy'));

      expect(onCopy).toHaveBeenCalledOnce();
      expect(isPopoverOpen(menu())).toBe(false);
    });

    it('onSelect calling preventDefault keeps the menu open', async () => {
      const onSelect = vi.fn((event: { preventDefault: () => void }) => {
        event.preventDefault();
      });
      render(<Example onSelect={onSelect} />);
      const user = await openWith('{Enter}');

      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalledOnce();
      expect(isPopoverOpen(menu())).toBe(true);
      expect(item('New file')).toHaveFocus();
    });

    it('a disabled item does nothing and leaves the menu open', async () => {
      const onSelect = vi.fn();
      render(<Example onSelect={onSelect} />);
      const user = await openWith('{Enter}');
      await user.keyboard('s');
      expect(item('Save')).toHaveFocus();

      await user.keyboard('{Enter}');
      await user.click(item('Save'));

      expect(onSelect).not.toHaveBeenCalled();
      expect(isPopoverOpen(menu())).toBe(true);
    });

    it('a checkbox item toggles and stays open', async () => {
      const onWrapChange = vi.fn();
      render(<OptionsExample onWrapChange={onWrapChange} />);
      const user = userEvent.setup();
      const wrap = screen.getByRole('menuitemcheckbox', { name: 'Wrap lines' });

      await user.click(wrap);
      expect(wrap).toHaveAttribute('aria-checked', 'true');
      wrap.focus();
      await user.keyboard(' ');
      expect(wrap).toHaveAttribute('aria-checked', 'false');

      expect(onWrapChange.mock.calls).toEqual([[true], [false]]);
      expect(screen.getByRole('menu')).toBeVisible();
    });

    it('a radio item checks itself, unchecks the others, and stays open', async () => {
      render(<OptionsExample />);
      const user = userEvent.setup();
      const small = screen.getByRole('menuitemradio', { name: 'Small' });
      small.focus();

      await user.keyboard('{Enter}');

      expect(small).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('menuitemradio', { name: 'Medium' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      expect(screen.getByRole('menu')).toBeVisible();
    });

    it('a disabled radio item cannot be checked', async () => {
      render(<OptionsExample />);

      await userEvent.setup().click(screen.getByRole('menuitemradio', { name: 'Large' }));

      expect(screen.getByRole('menuitemradio', { name: 'Large' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('an item onClick that calls preventDefault cancels the activation', async () => {
      const onSelect = vi.fn();
      render(
        <Menu.Root defaultOpen>
          <Menu.Trigger>Menu</Menu.Trigger>
          <Menu.Content>
            <Menu.Item
              onSelect={onSelect}
              onClick={(event) => {
                event.preventDefault();
              }}
            >
              One
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>,
      );

      await userEvent.setup().click(item('One'));

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('pointer', () => {
    it('moving over an item focuses it, disabled or not', async () => {
      render(<Example />);
      const user = userEvent.setup();
      await user.click(trigger());

      await user.hover(item('Copy'));
      expect(item('Copy')).toHaveFocus();
      await user.hover(item('Save'));
      expect(item('Save')).toHaveFocus();
    });
  });

  describe('state', () => {
    it('reports a light dismiss from the browser and syncs aria-expanded', async () => {
      const onOpenChange = vi.fn();
      render(<Example onOpenChange={onOpenChange} />);
      await openWith('{Enter}');

      act(() => {
        lightDismiss(menu());
      });

      await waitFor(() => {
        expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      });
      expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
    });

    it('a controlled parent decides', async () => {
      const onOpenChange = vi.fn();
      const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} />);
      const user = await openWith('{Enter}');

      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(isPopoverOpen(menu())).toBe(false);

      rerender(<Example open onOpenChange={onOpenChange} />);
      expect(isPopoverOpen(menu())).toBe(true);

      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(isPopoverOpen(menu())).toBe(true);
    });

    it('opens on first render with defaultOpen', () => {
      render(<Example defaultOpen />);

      expect(isPopoverOpen(menu())).toBe(true);
      expect(item('New file')).toHaveFocus();
    });

    it('exposes data-state on the trigger and content', async () => {
      render(<Example />);
      expect(trigger()).toHaveAttribute('data-state', 'closed');
      expect(menu()).toHaveAttribute('data-state', 'closed');

      await openWith('{Enter}');

      expect(trigger()).toHaveAttribute('data-state', 'open');
      expect(menu()).toHaveAttribute('data-state', 'open');
    });
  });

  describe('axe', () => {
    it('has no violations when closed', async () => {
      const { container } = render(<Example />);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations when open, with a disabled item and a shortcut', async () => {
      const { container } = render(<Example defaultOpen />);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations with checkbox items, a labelled radio group and separators', async () => {
      const { container } = render(<OptionsExample />);

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
