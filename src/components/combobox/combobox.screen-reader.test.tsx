import { virtual } from '@guidepup/virtual-screen-reader';
import { render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { stubPopover } from '../../../tests/stub-popover';
import { Combobox } from './combobox';

stubPopover();

beforeAll(() => {
  // jsdom has no scrollIntoView; scrolling the active option is checked in Playwright.
  Element.prototype.scrollIntoView = vi.fn();
});

function Example({ defaultValue }: { defaultValue?: string }) {
  return (
    <Combobox.Root defaultValue={defaultValue}>
      <Combobox.Label>Fruit</Combobox.Label>
      <Combobox.Input />
      <Combobox.Trigger />
      <Combobox.Content>
        <Combobox.Option value="apple">Apple</Combobox.Option>
        <Combobox.Option value="apricot">Apricot</Combobox.Option>
        <Combobox.Option value="banana">Banana</Combobox.Option>
        <Combobox.Option value="cherry" disabled>
          Cherry
        </Combobox.Option>
        <Combobox.Empty>No fruit matches.</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  );
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 600));
}

/*
 * Guidepup's virtual screen reader derives speech from the accessibility tree
 * the same way real screen readers do (role, name, state), so these assertions
 * catch regressions in what users hear. It does not replace testing with Orca,
 * NVDA, VoiceOver, or TalkBack; see "What's tested" in the docs.
 *
 * It reads aria-activedescendant changes as "active descendant <name>" on the
 * combobox; real screen readers read the option itself.
 */
describe('Combobox announcements', () => {
  afterEach(async () => {
    await virtual.stop();
  });

  it('announces the label, then the combobox with its role, popup, state and value', async () => {
    const { container } = render(<Example defaultValue="banana" />);

    await virtual.start({ container });
    await virtual.press('Tab');

    expect(await virtual.lastSpokenPhrase()).toBe(
      'combobox, Fruit, Banana, has popup listbox, not expanded, autocomplete in list, 1 control',
    );
  });

  it('announces each option as it becomes the active one, disabled included', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.press('Tab');
    await virtual.press('ArrowDown');
    expect(await virtual.lastSpokenPhrase()).toBe(
      'combobox, Fruit, has popup listbox, expanded, active descendant Apple, autocomplete in list, 1 control',
    );

    await virtual.press('ArrowUp');
    expect(await virtual.lastSpokenPhrase()).toContain('active descendant Cherry');
  });

  it('announces the result count once typing settles', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.press('Tab');
    await virtual.type('ap');
    await settle();

    const log = await virtual.spokenPhraseLog();
    expect(log.filter((phrase) => phrase.startsWith('polite:'))).toEqual(['polite: 2 results']);
  });

  it('announces "No results" when nothing matches', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.press('Tab');
    await virtual.type('zz');
    await settle();

    expect(await virtual.lastSpokenPhrase()).toBe('polite: No results');
  });

  it('announces the chosen value and the collapsed state after Enter', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.press('Tab');
    await virtual.type('ba');
    await virtual.press('ArrowDown');
    await virtual.press('Enter');

    expect(await virtual.lastSpokenPhrase()).toBe(
      'combobox, Fruit, Banana, has popup listbox, not expanded, autocomplete in list, 1 control',
    );
  });

  it('reads the options with their selected and disabled state in browse mode', async () => {
    const { container } = render(<Example defaultValue="banana" />);

    await virtual.start({ container });
    await virtual.press('Tab');
    await virtual.press('Alt+ArrowDown');
    for (let step = 0; step < 8; step++) await virtual.next();

    expect(await virtual.spokenPhraseLog()).toEqual(
      expect.arrayContaining([
        'listbox, Fruit, orientated vertically',
        'option, Banana, selected, position 3, set size 4',
        'option, Cherry, not selected, disabled, position 4, set size 4',
      ]),
    );
  });
});
