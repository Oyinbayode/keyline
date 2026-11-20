import { virtual } from '@guidepup/virtual-screen-reader';
import { render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { stubPopover } from '../../../tests/stub-popover';
import { Menu } from './menu';

stubPopover();

function Example() {
  const [wrap, setWrap] = useState(true);
  const [size, setSize] = useState('small');
  return (
    <Menu.Root>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Content>
        <Menu.Item shortcut="Ctrl+N">New file</Menu.Item>
        <Menu.Item disabled>Save</Menu.Item>
        <Menu.Separator />
        <Menu.CheckboxItem checked={wrap} onCheckedChange={setWrap}>
          Wrap lines
        </Menu.CheckboxItem>
        <Menu.RadioGroup value={size} onValueChange={setSize}>
          <Menu.Label>Text size</Menu.Label>
          <Menu.RadioItem value="small">Small</Menu.RadioItem>
          <Menu.RadioItem value="large">Large</Menu.RadioItem>
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

/*
 * Guidepup's virtual screen reader derives speech from the accessibility tree
 * the same way real screen readers do (role, name, state), so these assertions
 * catch regressions in what users hear. It does not replace testing with Orca,
 * NVDA, VoiceOver, or TalkBack; see "What's tested" in the docs.
 */
describe('Menu announcements', () => {
  afterEach(async () => {
    await virtual.stop();
  });

  it('announces the trigger as a collapsed menu button, and nothing of the closed menu', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.next();

    expect(await virtual.spokenPhraseLog()).toEqual([
      'button, Actions, not expanded, has popup menu',
      'button, Actions, not expanded, has popup menu',
    ]);
  });

  it('announces the first item when the menu opens, and each item with its state', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.press('Enter');
    expect(await virtual.lastSpokenPhrase()).toBe(
      'menuitem, New file, Ctrl+N, position 1, set size 2',
    );

    await virtual.press('ArrowDown');
    expect(await virtual.lastSpokenPhrase()).toBe(
      'menuitem, Save, disabled, position 2, set size 2',
    );

    // Positions count items of the same role, and a separator starts a new run.
    await virtual.press('ArrowDown');
    expect(await virtual.lastSpokenPhrase()).toBe(
      'menuitemcheckbox, Wrap lines, checked, position 1, set size 1',
    );

    await virtual.press('ArrowDown');
    expect(await virtual.lastSpokenPhrase()).toBe(
      'menuitemradio, Small, checked, position 1, set size 2',
    );
  });

  it('announces the new state when a checkbox item is toggled', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.press('Enter');
    await virtual.press('ArrowDown');
    await virtual.press('ArrowDown');
    await virtual.press(' ');

    expect(await virtual.lastSpokenPhrase()).toBe(
      'menuitemcheckbox, Wrap lines, not checked, position 1, set size 1',
    );
  });

  it('reads the menu, its group label and separator in browse mode', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.press('Enter');
    await virtual.press('End');
    // From the last item, reading on wraps round through the trigger and into the open menu.
    for (let step = 0; step < 14; step++) await virtual.next();

    expect(await virtual.spokenPhraseLog()).toEqual(
      expect.arrayContaining([
        'menu, Actions, orientated vertically',
        'separator, orientated horizontally, max value 100, min value 0',
        'group, Text size',
      ]),
    );
  });

  it('announces the trigger again, collapsed, when Esc closes the menu', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.press('Enter');
    await virtual.press('Escape');

    expect(await virtual.lastSpokenPhrase()).toBe('button, Actions, not expanded, has popup menu');
  });
});
