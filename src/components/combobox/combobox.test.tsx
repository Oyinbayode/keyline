import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { isPopoverOpen, stubPopover } from '../../../tests/stub-popover';
import type { ComboboxRootProps } from './combobox';
import { Combobox } from './combobox';

stubPopover();

beforeAll(() => {
  // jsdom lays nothing out and has no scrollIntoView; the scrolling itself is checked in Playwright.
  Element.prototype.scrollIntoView = vi.fn();
});

const fruits = ['Apple', 'Apricot', 'Banana', 'Cherry', 'Crème brûlée', 'Date'];

function Example({
  disabledOption,
  ...rootProps
}: Omit<ComboboxRootProps, 'children'> & { disabledOption?: string }) {
  return (
    <>
      <button type="button">Before</button>
      <Combobox.Root {...rootProps}>
        <Combobox.Label>Fruit</Combobox.Label>
        <Combobox.Input />
        <Combobox.Trigger />
        <Combobox.Content>
          {fruits.map((fruit) => (
            <Combobox.Option
              key={fruit}
              value={fruit.toLowerCase()}
              disabled={fruit === disabledOption}
            >
              {fruit}
            </Combobox.Option>
          ))}
          <Combobox.Empty>No fruit matches.</Combobox.Empty>
        </Combobox.Content>
      </Combobox.Root>
      <button type="button">After</button>
    </>
  );
}

const input = () => screen.getByRole('combobox');
// By id: with no options left it is no longer a listbox (see "no results").
const listbox = () =>
  document.getElementById(input().getAttribute('aria-controls') ?? '') as HTMLElement;
const option = (name: string) => screen.getByRole('option', { name });
const shownOptions = () =>
  screen.queryAllByRole('option').map((element) => element.dataset.text ?? '');
const activeOption = () => {
  const id = input().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id)?.dataset.text : undefined;
};
const status = () => screen.getByRole('status');

async function typeInto(text: string) {
  const user = userEvent.setup();
  await user.click(input());
  if (text) await user.keyboard(text);
  return user;
}

describe('Combobox', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('semantics', () => {
    it('renders an editable combobox wired to a listbox, labelled by a real label', () => {
      render(<Example />);
      const field = input();

      expect(field.tagName).toBe('INPUT');
      expect(field).toHaveAttribute('aria-autocomplete', 'list');
      expect(field).toHaveAttribute('aria-expanded', 'false');
      expect(field).toHaveAttribute('aria-controls', listbox().id);
      expect(field).toHaveAttribute('autocomplete', 'off');
      expect(field).not.toHaveAttribute('aria-activedescendant');
      expect(screen.getByText('Fruit').tagName).toBe('LABEL');
      expect(listbox()).toHaveAttribute('aria-labelledby', screen.getByText('Fruit').id);
      expect(listbox()).toHaveAttribute('popover', 'manual');
    });

    it('gives the button a name and keeps it out of the tab order', () => {
      render(<Example />);
      const button = screen.getByRole('button', { name: 'Show suggestions' });

      expect(button).toHaveAttribute('tabindex', '-1');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-controls', listbox().id);
    });

    it('keeps the closed list out of the accessibility tree', () => {
      render(<Example />);

      expect(screen.queryByRole('listbox')).toBeNull();
      expect(isPopoverOpen(listbox())).toBe(false);
    });

    it('marks the selected option with aria-selected and the disabled one with aria-disabled', async () => {
      render(<Example defaultValue="banana" disabledOption="Date" />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Show suggestions' }));

      expect(option('Banana')).toHaveAttribute('aria-selected', 'true');
      expect(option('Apple')).toHaveAttribute('aria-selected', 'false');
      expect(option('Date')).toHaveAttribute('aria-disabled', 'true');
    });

    it('passes props, class names and refs through', () => {
      const inputRef = createRef<HTMLInputElement>();
      render(
        <Combobox.Root className="root" data-testid="root">
          <Combobox.Label>Fruit</Combobox.Label>
          <Combobox.Input ref={inputRef} className="field" placeholder="Pick one" />
          <Combobox.Content className="list">
            <Combobox.Option value="a">A</Combobox.Option>
          </Combobox.Content>
        </Combobox.Root>,
      );

      expect(screen.getByTestId('root')).toHaveClass('kl-combobox', 'root');
      expect(inputRef.current).toBe(input());
      expect(input()).toHaveClass('kl-combobox-input', 'field');
      expect(input()).toHaveAttribute('placeholder', 'Pick one');
      expect(listbox()).toHaveClass('kl-combobox-content', 'list');
    });

    it('throws a clear error outside Combobox.Root', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<Combobox.Input />)).toThrow(
        'Combobox.Input must be inside Combobox.Root',
      );
    });
  });

  describe('typing', () => {
    it('opens the list and filters it, ignoring case and accents', async () => {
      render(<Example />);

      await typeInto('AP');
      expect(isPopoverOpen(listbox())).toBe(true);
      expect(input()).toHaveAttribute('aria-expanded', 'true');
      expect(shownOptions()).toEqual(['Apple', 'Apricot']);

      await userEvent.setup().clear(input());
      await userEvent.setup().keyboard('creme bru');
      expect(shownOptions()).toEqual(['Crème brûlée']);
    });

    it('marks the matching characters with <mark>, accents and all', async () => {
      render(<Example />);

      await typeInto('brul');

      const mark = option('Crème brûlée').querySelector('mark');
      expect(mark).toHaveTextContent('brûl');
      expect(mark).toHaveClass('kl-combobox-match');
    });

    it('highlights nothing, so Enter does not choose an option the user never reached', async () => {
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);

      await typeInto('ch{Enter}');

      expect(input()).not.toHaveAttribute('aria-activedescendant');
      expect(onValueChange).not.toHaveBeenCalled();
      expect(input()).toHaveValue('ch');
    });

    it('shows Combobox.Empty when nothing matches', async () => {
      render(<Example />);

      await typeInto('zz');

      expect(shownOptions()).toEqual([]);
      expect(screen.getByText('No fruit matches.')).toBeVisible();
    });

    it('shows every option with filter={false}, for results filtered elsewhere', async () => {
      render(<Example filter={false} />);

      await typeInto('zz');

      expect(shownOptions()).toHaveLength(fruits.length);
      expect(screen.queryByText('No fruit matches.')).toBeNull();
    });

    it('uses a custom filter', async () => {
      render(
        <Example filter={(text, typed) => text.toLowerCase().startsWith(typed.toLowerCase())} />,
      );

      await typeInto('a');

      expect(shownOptions()).toEqual(['Apple', 'Apricot']);
    });

    it('shows every option again once the input holds the chosen option', async () => {
      render(<Example />);
      const user = await typeInto('ban{ArrowDown}{Enter}');
      expect(input()).toHaveValue('Banana');

      await user.keyboard('{ArrowDown}');

      expect(shownOptions()).toHaveLength(fruits.length);
    });
  });

  describe('keyboard', () => {
    it('Down opens the list on the first option, then moves and wraps', async () => {
      render(<Example />);
      const user = await typeInto('');

      await user.keyboard('{ArrowDown}');
      expect(isPopoverOpen(listbox())).toBe(true);
      expect(activeOption()).toBe('Apple');

      await user.keyboard('{ArrowDown}{ArrowDown}');
      expect(activeOption()).toBe('Banana');
      expect(input()).toHaveFocus();

      await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
      expect(activeOption()).toBe('Date');
    });

    it('Up opens the list on the last option', async () => {
      render(<Example />);

      await typeInto('{ArrowUp}');

      expect(activeOption()).toBe('Date');
    });

    it('moves onto disabled options, which Enter cannot choose', async () => {
      const onValueChange = vi.fn();
      render(<Example disabledOption="Apricot" onValueChange={onValueChange} />);

      await typeInto('{ArrowDown}{ArrowDown}{Enter}');

      expect(activeOption()).toBe('Apricot');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('Alt+Down opens without moving; Alt+Up closes', async () => {
      render(<Example />);
      const user = await typeInto('{Alt>}{ArrowDown}{/Alt}');

      expect(isPopoverOpen(listbox())).toBe(true);
      expect(input()).not.toHaveAttribute('aria-activedescendant');

      await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
      expect(isPopoverOpen(listbox())).toBe(false);
    });

    it('Enter chooses the active option, fills the input and closes', async () => {
      const onValueChange = vi.fn();
      const onInputValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} onInputValueChange={onInputValueChange} />);

      await typeInto('ch{ArrowDown}{Enter}');

      expect(onValueChange).toHaveBeenCalledExactlyOnceWith('cherry');
      expect(onInputValueChange).toHaveBeenLastCalledWith('Cherry');
      expect(input()).toHaveValue('Cherry');
      expect(isPopoverOpen(listbox())).toBe(false);
      expect(input()).not.toHaveAttribute('aria-activedescendant');
      expect(input()).toHaveFocus();
    });

    it('Esc closes an open list, then clears the input and the choice', async () => {
      const onValueChange = vi.fn();
      render(<Example defaultValue="cherry" onValueChange={onValueChange} />);
      const user = await typeInto('{ArrowDown}');

      await user.keyboard('{Escape}');
      expect(isPopoverOpen(listbox())).toBe(false);
      expect(input()).toHaveValue('Cherry');

      await user.keyboard('{Escape}');
      expect(input()).toHaveValue('');
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith('');
    });

    it('Esc on an empty, closed combobox is left alone, so a dialog can close', async () => {
      render(<Example />);
      await typeInto('');
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      input().dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('Home, End, Left and Right stay with the caret and clear the active option', async () => {
      render(<Example />);
      const user = await typeInto('an{ArrowDown}');
      expect(activeOption()).toBe('Banana');

      for (const key of ['Home', 'End', 'ArrowLeft', 'ArrowRight']) {
        await user.keyboard('{ArrowDown}');
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        act(() => {
          input().dispatchEvent(event);
        });
        expect(event.defaultPrevented, key).toBe(false);
        expect(input()).not.toHaveAttribute('aria-activedescendant');
      }
    });

    it('Tab closes the list without choosing, and moves on', async () => {
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);
      const user = await typeInto('ch{ArrowDown}');

      await user.keyboard('{Tab}');

      expect(isPopoverOpen(listbox())).toBe(false);
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('ignores Enter and arrows while an IME is composing', async () => {
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);
      await typeInto('ch{ArrowDown}');

      fireEvent.keyDown(input(), { key: 'ArrowDown', isComposing: true });
      fireEvent.keyDown(input(), { key: 'Enter', isComposing: true });

      expect(activeOption()).toBe('Cherry');
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('leaving the input', () => {
    it('restores the chosen option’s text when the typed text matches nothing', async () => {
      render(<Example defaultValue="banana" />);
      const user = await typeInto('{Backspace>3/}xyz');

      await user.click(screen.getByRole('button', { name: 'After' }));

      expect(input()).toHaveValue('Banana');
    });

    it('empties text that matches nothing when nothing was chosen', async () => {
      render(<Example />);
      const user = await typeInto('xyz');

      await user.tab();

      expect(input()).toHaveValue('');
    });

    it('chooses an option whose text was typed exactly, ignoring case and accents', async () => {
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);
      const user = await typeInto('creme brulee');

      await user.tab();

      expect(onValueChange).toHaveBeenCalledExactlyOnceWith('crème brûlée');
      expect(input()).toHaveValue('Crème brûlée');
    });

    it('clears the choice when the text was deleted', async () => {
      const onValueChange = vi.fn();
      render(<Example defaultValue="date" onValueChange={onValueChange} />);
      const user = userEvent.setup();
      await user.clear(input());

      await user.tab();

      expect(onValueChange).toHaveBeenCalledExactlyOnceWith('');
    });
  });

  describe('pointer', () => {
    it('a press on an option does not take focus from the input; the click chooses it', async () => {
      render(<Example />);
      const user = await typeInto('a');

      expect(fireEvent.pointerDown(option('Banana'))).toBe(false);
      await user.click(option('Banana'));

      expect(input()).toHaveValue('Banana');
      expect(input()).toHaveFocus();
    });

    it('moving over an option makes it the active one', async () => {
      render(<Example />);
      const user = await typeInto('a');

      await user.hover(option('Date'));

      expect(activeOption()).toBe('Date');
    });

    it('marks how the active option was reached: keyboard or pointer', async () => {
      render(<Example />);
      const user = await typeInto('a{ArrowDown}');
      expect(option('Apple')).toHaveAttribute('data-active', 'keyboard');

      await user.hover(option('Banana'));
      expect(option('Banana')).toHaveAttribute('data-active', 'pointer');
      expect(option('Apple')).not.toHaveAttribute('data-active');

      await user.keyboard('{ArrowDown}');
      expect(option('Date')).toHaveAttribute('data-active', 'keyboard');
      await user.hover(option('Date'));
      expect(option('Date')).toHaveAttribute('data-active', 'pointer');
    });

    it('the button opens and closes the list and leaves focus in the input', async () => {
      render(<Example />);
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: 'Show suggestions' });

      expect(fireEvent.pointerDown(button)).toBe(false);
      await user.click(button);
      expect(isPopoverOpen(listbox())).toBe(true);
      expect(input()).toHaveFocus();
      expect(button).toHaveAttribute('aria-expanded', 'true');

      await user.click(button);
      expect(isPopoverOpen(listbox())).toBe(false);
    });

    it('a disabled option cannot be chosen by clicking', async () => {
      render(<Example disabledOption="Banana" />);
      const user = await typeInto('a');

      await user.click(option('Banana'));

      expect(input()).toHaveValue('a');
    });
  });

  describe('result count', () => {
    it('announces the count once typing settles, and not on every keystroke', () => {
      vi.useFakeTimers();
      render(<Example />);

      fireEvent.change(input(), { target: { value: 'a' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      fireEvent.change(input(), { target: { value: 'ap' } });
      expect(status()).toHaveTextContent('');

      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(status()).toHaveTextContent('');
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(status()).toHaveTextContent('2 results');
    });

    it('says "No results" and "1 result", and takes localised messages', () => {
      vi.useFakeTimers();
      const { unmount } = render(<Example />);

      fireEvent.change(input(), { target: { value: 'zz' } });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(status()).toHaveTextContent('No results');

      fireEvent.change(input(), { target: { value: 'dat' } });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(status()).toHaveTextContent('1 result');
      unmount();

      render(<Example resultsMessage={(count) => `${String(count)} résultats`} />);
      fireEvent.change(input(), { target: { value: 'a' } });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(status()).toHaveTextContent('4 résultats');
    });

    it('drops a pending count when an option is chosen first', () => {
      vi.useFakeTimers();
      render(<Example />);

      fireEvent.change(input(), { target: { value: 'ch' } });
      fireEvent.keyDown(input(), { key: 'ArrowDown' });
      fireEvent.keyDown(input(), { key: 'Enter' });
      expect(input()).toHaveValue('Cherry');
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(status()).toHaveTextContent('');
    });
  });

  describe('state and forms', () => {
    it('starts with the selected option’s text, or defaultInputValue', () => {
      const { unmount } = render(<Example defaultValue="cherry" />);
      expect(input()).toHaveValue('Cherry');
      unmount();

      render(<Example defaultValue="cherry" defaultInputValue="ch" />);
      expect(input()).toHaveValue('ch');
    });

    it('works fully controlled', async () => {
      function Controlled() {
        const [value, setValue] = useState('apple');
        const [inputValue, setInputValue] = useState('Apple');
        const [open, setOpen] = useState(false);
        return (
          <>
            <Example
              value={value}
              onValueChange={setValue}
              inputValue={inputValue}
              onInputValueChange={setInputValue}
              open={open}
              onOpenChange={setOpen}
            />
            <p>{`${value}|${inputValue}|${String(open)}`}</p>
          </>
        );
      }
      render(<Controlled />);

      await typeInto('{Backspace>5/}da{ArrowDown}{Enter}');

      expect(screen.getByText('date|Date|false')).toBeInTheDocument();
    });

    it('shows the text of a value set from outside, and clears it when the value is cleared', async () => {
      function Reset() {
        const [value, setValue] = useState('banana');
        return (
          <>
            <Example value={value} onValueChange={setValue} />
            <button
              type="button"
              onClick={() => {
                setValue('cherry');
              }}
            >
              Load saved
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('');
              }}
            >
              Reset
            </button>
          </>
        );
      }
      render(<Reset />);
      const user = userEvent.setup();
      expect(input()).toHaveValue('Banana');

      await user.click(screen.getByRole('button', { name: 'Load saved' }));
      expect(input()).toHaveValue('Cherry');
      await user.click(screen.getByRole('button', { name: 'Show suggestions' }));
      // Not filtered by stale text: the input shows the choice, so every option is listed.
      expect(shownOptions()).toHaveLength(fruits.length);

      await user.click(screen.getByRole('button', { name: 'Reset' }));
      expect(input()).toHaveValue('');
    });

    it('waits for an option that is not rendered yet before showing its text', () => {
      function Late({ options, value }: { options: string[]; value: string }) {
        return (
          <Combobox.Root value={value}>
            <Combobox.Label>City</Combobox.Label>
            <Combobox.Input />
            <Combobox.Content>
              {options.map((city) => (
                <Combobox.Option key={city} value={city.toLowerCase()}>
                  {city}
                </Combobox.Option>
              ))}
            </Combobox.Content>
          </Combobox.Root>
        );
      }
      const { rerender } = render(<Late options={['Accra']} value="accra" />);
      expect(input()).toHaveValue('Accra');

      rerender(<Late options={['Accra']} value="lagos" />);
      expect(input()).toHaveValue('Accra');

      rerender(<Late options={['Accra', 'Lagos']} value="lagos" />);
      expect(input()).toHaveValue('Lagos');
    });

    it('submits the selected value through a hidden input', () => {
      const { container } = render(<Example name="fruit" defaultValue="date" />);

      const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"]');
      expect(hidden).toHaveAttribute('name', 'fruit');
      expect(hidden).toHaveValue('date');
    });

    it('disables the input, the button and the hidden input', () => {
      const { container } = render(<Example name="fruit" disabled />);

      expect(input()).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Show suggestions' })).toBeDisabled();
      expect(container.querySelector('input[type="hidden"]')).toBeDisabled();
    });
  });

  describe('axe', () => {
    it('has no violations when closed', async () => {
      const { container } = render(<Example defaultValue="banana" />);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations when open with an active, a selected and a disabled option', async () => {
      const { container } = render(<Example defaultValue="banana" disabledOption="Date" />);
      await typeInto('{ArrowDown}');

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations with groups and a match marked', async () => {
      const { container } = render(
        <Combobox.Root>
          <Combobox.Label>Time zone</Combobox.Label>
          <Combobox.Input />
          <Combobox.Content>
            <Combobox.Group>
              <Combobox.GroupLabel>Africa</Combobox.GroupLabel>
              <Combobox.Option value="lagos">Lagos</Combobox.Option>
            </Combobox.Group>
          </Combobox.Content>
        </Combobox.Root>,
      );
      await typeInto('');
      await userEvent.setup().keyboard('la');

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations with no results', async () => {
      const { container } = render(<Example />);
      await typeInto('zz');

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations when disabled', async () => {
      const { container } = render(<Example disabled />);

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
