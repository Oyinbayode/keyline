import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Switch } from './switch';

const getSwitch = (name?: string) => screen.getByRole('switch', name ? { name } : {});

describe('Switch', () => {
  describe('semantics', () => {
    it('is a native button with role="switch" and aria-checked', () => {
      render(<Switch aria-label="Wi-Fi" />);
      const toggle = getSwitch('Wi-Fi');

      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle).toHaveAttribute('type', 'button');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      expect(toggle).toHaveAttribute('data-state', 'unchecked');
    });

    it('hides the thumb from assistive technology', () => {
      render(<Switch aria-label="Wi-Fi" />);

      expect(getSwitch().querySelector('.kl-switch-thumb')).toHaveAttribute('aria-hidden', 'true');
    });

    it.each([
      [
        'a wrapping <label>',
        <label key="wrap">
          Wi-Fi <Switch />
        </label>,
      ],
      [
        '<label htmlFor>',
        <div key="for">
          <label htmlFor="wifi">Wi-Fi</label>
          <Switch id="wifi" />
        </div>,
      ],
      [
        'aria-labelledby',
        <div key="labelledby">
          <span id="wifi-label">Wi-Fi</span>
          <Switch aria-labelledby="wifi-label" />
        </div>,
      ],
      ['aria-label', <Switch key="label" aria-label="Wi-Fi" />],
    ])('takes its accessible name from %s', (_, markup) => {
      render(markup);

      expect(getSwitch('Wi-Fi')).toBeInTheDocument();
    });

    it('warns in development when it has no accessible name', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<Switch />);

      expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('no accessible name'));
    });

    it('does not warn when labelled', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <label>
          Wi-Fi <Switch />
        </label>,
      );

      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('uncontrolled', () => {
    it('toggles on click and reports each change', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch aria-label="Wi-Fi" onCheckedChange={onCheckedChange} />);

      await user.click(getSwitch());
      expect(getSwitch()).toHaveAttribute('aria-checked', 'true');
      expect(getSwitch()).toHaveAttribute('data-state', 'checked');

      await user.click(getSwitch());
      expect(getSwitch()).toHaveAttribute('aria-checked', 'false');
      expect(onCheckedChange.mock.calls).toEqual([[true], [false]]);
    });

    it('starts from defaultChecked', () => {
      render(<Switch aria-label="Wi-Fi" defaultChecked />);

      expect(getSwitch()).toHaveAttribute('aria-checked', 'true');
    });

    it.each([' ', '{Enter}'])('toggles with the keyboard (%s)', async (key) => {
      const user = userEvent.setup();
      render(<Switch aria-label="Wi-Fi" />);

      await user.tab();
      await user.keyboard(key);

      expect(getSwitch()).toHaveFocus();
      expect(getSwitch()).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles when its wrapping label text is clicked', async () => {
      const user = userEvent.setup();
      render(
        <label>
          Wi-Fi <Switch />
        </label>,
      );

      await user.click(screen.getByText('Wi-Fi'));

      expect(getSwitch()).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('controlled', () => {
    it('only changes when the parent passes a new value', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch aria-label="Wi-Fi" checked={false} onCheckedChange={onCheckedChange} />);

      await user.click(getSwitch());

      expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
      expect(getSwitch()).toHaveAttribute('aria-checked', 'false');
    });

    it('follows parent state', async () => {
      function Parent() {
        const [isOn, setIsOn] = useState(true);
        return (
          <>
            <Switch aria-label="Wi-Fi" checked={isOn} onCheckedChange={setIsOn} />
            <output>{isOn ? 'on' : 'off'}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);

      await user.click(getSwitch());

      expect(getSwitch()).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('status')).toHaveTextContent('off');
    });
  });

  describe('disabled', () => {
    it('cannot be focused or toggled', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(
        <>
          <Switch aria-label="Wi-Fi" disabled onCheckedChange={onCheckedChange} />
          <button type="button">Next</button>
        </>,
      );

      await user.tab();
      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();

      await user.click(getSwitch());
      expect(onCheckedChange).not.toHaveBeenCalled();
      expect(getSwitch()).toBeDisabled();
      expect(getSwitch()).toHaveAttribute('data-disabled', '');
    });
  });

  describe('composition', () => {
    it('forwards ref, className, style, and other props to the button', () => {
      const ref = createRef<HTMLButtonElement>();
      render(
        <Switch
          ref={ref}
          aria-label="Wi-Fi"
          className="custom"
          style={{ marginInlineStart: 8 }}
          data-testid="wifi"
          aria-describedby="hint"
        />,
      );

      const toggle = getSwitch();
      expect(ref.current).toBe(toggle);
      expect(toggle).toHaveClass('kl-switch', 'custom');
      expect(toggle).toHaveStyle({ marginInlineStart: '8px' });
      expect(toggle).toHaveAttribute('data-testid', 'wifi');
      expect(toggle).toHaveAttribute('aria-describedby', 'hint');
    });

    it('lets onClick cancel the toggle with preventDefault', async () => {
      const user = userEvent.setup();
      render(
        <Switch
          aria-label="Wi-Fi"
          onClick={(event) => {
            event.preventDefault();
          }}
        />,
      );

      await user.click(getSwitch());

      expect(getSwitch()).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('forms', () => {
    function submittedEntries(form: HTMLFormElement) {
      return Object.fromEntries(new FormData(form));
    }

    it('submits name=value only while on, like a checkbox', async () => {
      const user = userEvent.setup();
      render(
        <form aria-label="Settings">
          <Switch aria-label="Newsletter" name="newsletter" value="yes" />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form');

      expect(submittedEntries(form)).toEqual({});
      await user.click(getSwitch());
      expect(submittedEntries(form)).toEqual({ newsletter: 'yes' });
    });

    it('does not submit while disabled', () => {
      render(
        <form aria-label="Settings">
          <Switch aria-label="Newsletter" name="newsletter" defaultChecked disabled />
        </form>,
      );

      expect(submittedEntries(screen.getByRole<HTMLFormElement>('form'))).toEqual({});
    });
  });

  describe('axe', () => {
    it.each([
      ['unchecked', {}],
      ['checked', { defaultChecked: true }],
      ['disabled', { disabled: true }],
      ['disabled and checked', { disabled: true, defaultChecked: true }],
    ])('has no violations when %s', async (_, props) => {
      const { container } = render(
        <label>
          Wi-Fi <Switch {...props} />
        </label>,
      );

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
