import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RovingOrientation } from './use-roving-focus';
import { useRovingFocus } from './use-roving-focus';

interface ToolbarProps {
  orientation?: RovingOrientation;
  loop?: boolean;
  disabled?: string[];
  onNavigate?: (item: HTMLElement) => void;
}

function Toolbar({ orientation, loop, disabled = [], onNavigate }: ToolbarProps) {
  const onKeyDown = useRovingFocus({ itemSelector: 'button', orientation, loop, onNavigate });
  return (
    <div role="toolbar" aria-label="Formatting" onKeyDown={onKeyDown}>
      {['Bold', 'Italic', 'Underline', 'Strike'].map((name) => (
        <button key={name} type="button" disabled={disabled.includes(name)}>
          {name}
        </button>
      ))}
    </div>
  );
}

const button = (name: string) => screen.getByRole('button', { name });

async function focusThenPress(name: string, keys: string) {
  const user = userEvent.setup();
  button(name).focus();
  await user.keyboard(keys);
}

describe('useRovingFocus', () => {
  describe('horizontal', () => {
    it('moves with Right and Left', async () => {
      render(<Toolbar />);

      await focusThenPress('Bold', '{ArrowRight}');
      expect(button('Italic')).toHaveFocus();

      await focusThenPress('Italic', '{ArrowLeft}');
      expect(button('Bold')).toHaveFocus();
    });

    it('ignores Up and Down', async () => {
      render(<Toolbar />);

      await focusThenPress('Italic', '{ArrowDown}{ArrowUp}');

      expect(button('Italic')).toHaveFocus();
    });

    it('flips Left and Right under dir="rtl"', async () => {
      render(
        <div dir="rtl">
          <Toolbar />
        </div>,
      );

      await focusThenPress('Bold', '{ArrowLeft}');
      expect(button('Italic')).toHaveFocus();

      await focusThenPress('Italic', '{ArrowRight}');
      expect(button('Bold')).toHaveFocus();
    });
  });

  describe('vertical', () => {
    it('moves with Down and Up and ignores Left and Right', async () => {
      render(<Toolbar orientation="vertical" />);

      await focusThenPress('Bold', '{ArrowDown}');
      expect(button('Italic')).toHaveFocus();

      await focusThenPress('Italic', '{ArrowRight}{ArrowLeft}');
      expect(button('Italic')).toHaveFocus();

      await focusThenPress('Italic', '{ArrowUp}');
      expect(button('Bold')).toHaveFocus();
    });

    it('is not affected by dir="rtl"', async () => {
      render(
        <div dir="rtl">
          <Toolbar orientation="vertical" />
        </div>,
      );

      await focusThenPress('Bold', '{ArrowDown}');

      expect(button('Italic')).toHaveFocus();
    });
  });

  it('accepts all four arrows when orientation is "both"', async () => {
    render(<Toolbar orientation="both" />);

    await focusThenPress('Bold', '{ArrowRight}{ArrowDown}');
    expect(button('Underline')).toHaveFocus();

    await focusThenPress('Underline', '{ArrowLeft}{ArrowUp}');
    expect(button('Bold')).toHaveFocus();
  });

  it('jumps to the ends with Home and End', async () => {
    render(<Toolbar />);

    await focusThenPress('Italic', '{End}');
    expect(button('Strike')).toHaveFocus();

    await focusThenPress('Strike', '{Home}');
    expect(button('Bold')).toHaveFocus();
  });

  it('wraps at both ends by default', async () => {
    render(<Toolbar />);

    await focusThenPress('Strike', '{ArrowRight}');
    expect(button('Bold')).toHaveFocus();

    await focusThenPress('Bold', '{ArrowLeft}');
    expect(button('Strike')).toHaveFocus();
  });

  it('stops at the ends when loop is false', async () => {
    render(<Toolbar loop={false} />);

    await focusThenPress('Strike', '{ArrowRight}');
    expect(button('Strike')).toHaveFocus();

    await focusThenPress('Bold', '{ArrowLeft}');
    expect(button('Bold')).toHaveFocus();
  });

  it('skips disabled items, including at the ends and when wrapping', async () => {
    render(<Toolbar disabled={['Italic', 'Strike']} />);

    await focusThenPress('Bold', '{ArrowRight}');
    expect(button('Underline')).toHaveFocus();

    await focusThenPress('Underline', '{ArrowRight}');
    expect(button('Bold')).toHaveFocus();

    await focusThenPress('Bold', '{End}');
    expect(button('Underline')).toHaveFocus();
  });

  it('skips items marked aria-disabled', async () => {
    function AriaDisabled() {
      const onKeyDown = useRovingFocus({ itemSelector: '[role="radio"]' });
      return (
        // The radios are the focus stops, not the group.
        // eslint-disable-next-line jsx-a11y/interactive-supports-focus
        <div role="radiogroup" aria-label="Size" onKeyDown={onKeyDown}>
          <span role="radio" aria-checked="true" tabIndex={0}>
            Small
          </span>
          <span role="radio" aria-checked="false" aria-disabled="true" tabIndex={-1}>
            Medium
          </span>
          <span role="radio" aria-checked="false" tabIndex={-1}>
            Large
          </span>
        </div>
      );
    }
    render(<AriaDisabled />);
    screen.getByRole('radio', { name: 'Small' }).focus();

    await userEvent.setup().keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'Large' })).toHaveFocus();
  });

  it('reports each keyboard move and leaves modified keys alone', async () => {
    const onNavigate = vi.fn();
    render(<Toolbar onNavigate={onNavigate} />);

    await focusThenPress('Bold', '{ArrowRight}');
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(button('Italic'));

    await focusThenPress('Italic', '{Alt>}{ArrowRight}{/Alt}');
    expect(button('Italic')).toHaveFocus();
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('prevents the default scroll for keys it handles only', () => {
    render(<Toolbar />);
    button('Bold').focus();

    const arrow = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    const letter = new KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true });
    button('Bold').dispatchEvent(arrow);
    button('Italic').dispatchEvent(letter);

    expect(arrow.defaultPrevented).toBe(true);
    expect(letter.defaultPrevented).toBe(false);
  });
});
