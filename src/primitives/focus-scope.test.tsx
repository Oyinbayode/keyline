import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { FocusScope } from './focus-scope';
import { Portal } from './portal';

function ThreeButtons() {
  return (
    <>
      <button type="button">First</button>
      <button type="button">Second</button>
      <button type="button">Last</button>
    </>
  );
}

function Toggleable({ trapped = true }: { trapped?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Open
      </button>
      {isOpen && (
        <FocusScope trapped={trapped} aria-label="Panel">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
            }}
          >
            Close
          </button>
          <button type="button">Other</button>
        </FocusScope>
      )}
      <button type="button">Outside</button>
    </>
  );
}

const button = (name: string) => screen.getByRole('button', { name });

describe('FocusScope', () => {
  it('moves focus to the first tabbable element on mount', () => {
    render(
      <FocusScope>
        <ThreeButtons />
      </FocusScope>,
    );

    expect(button('First')).toHaveFocus();
  });

  it('focuses the container itself when it has nothing tabbable', () => {
    render(
      <FocusScope data-testid="scope">
        <p>Read-only content</p>
      </FocusScope>,
    );

    expect(screen.getByTestId('scope')).toHaveFocus();
  });

  it('leaves focus alone when focusOnMount is false', () => {
    render(
      <FocusScope focusOnMount={false}>
        <ThreeButtons />
      </FocusScope>,
    );

    expect(document.body).toHaveFocus();
  });

  it('wraps Tab from the last element to the first, and Shift+Tab back', async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <ThreeButtons />
      </FocusScope>,
    );

    await user.tab();
    await user.tab();
    expect(button('Last')).toHaveFocus();

    await user.tab();
    expect(button('First')).toHaveFocus();

    await user.tab({ shift: true });
    expect(button('Last')).toHaveFocus();
  });

  it('skips disabled, hidden, inert, and display:none elements at the edges', async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <button type="button" disabled>
          Disabled
        </button>
        <button type="button">First real</button>
        <button type="button">Last real</button>
        <button type="button" hidden>
          Hidden
        </button>
        <div inert>
          <button type="button">Inert</button>
        </div>
        <div style={{ display: 'none' }}>
          <button type="button">Not displayed</button>
        </div>
        <button type="button" tabIndex={-1}>
          Programmatic only
        </button>
      </FocusScope>,
    );

    expect(button('First real')).toHaveFocus();
    await user.tab({ shift: true });
    expect(button('Last real')).toHaveFocus();
    await user.tab();
    expect(button('First real')).toHaveFocus();
  });

  it('keeps focus on the container when Tab is pressed with nothing tabbable', async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope data-testid="scope">
          <p>Read-only content</p>
        </FocusScope>
        <button type="button">Outside</button>
      </>,
    );

    await user.tab();

    expect(screen.getByTestId('scope')).toHaveFocus();
  });

  it('pulls focus back when it escapes the scope', () => {
    render(
      <>
        <FocusScope>
          <ThreeButtons />
        </FocusScope>
        <button type="button">Outside</button>
      </>,
    );
    button('Second').focus();

    act(() => {
      button('Outside').focus();
    });

    expect(button('Second')).toHaveFocus();
  });

  it('catches focus on the container when the focused element is removed', async () => {
    function RemovableItem() {
      const [isVisible, setIsVisible] = useState(true);
      return (
        <FocusScope data-testid="scope">
          {isVisible && (
            <button
              type="button"
              onClick={() => {
                setIsVisible(false);
              }}
            >
              Delete me
            </button>
          )}
          <button type="button">Keep</button>
        </FocusScope>
      );
    }
    const user = userEvent.setup();
    render(<RemovableItem />);

    await user.click(button('Delete me'));
    await waitFor(() => {
      expect(screen.getByTestId('scope')).toHaveFocus();
    });
  });

  it('returns focus to the element that opened it on unmount', async () => {
    const user = userEvent.setup();
    render(<Toggleable />);

    await user.click(button('Open'));
    expect(button('Close')).toHaveFocus();

    await user.click(button('Close'));
    expect(button('Open')).toHaveFocus();
  });

  it('lets Tab leave when trapped is false', async () => {
    const user = userEvent.setup();
    render(<Toggleable trapped={false} />);

    await user.click(button('Open'));
    await user.tab();
    await user.tab();

    expect(button('Outside')).toHaveFocus();
  });

  it('defers to the most recently mounted scope, even across portals', async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <button type="button">Outer</button>
        <Portal>
          <FocusScope>
            <button type="button">Inner first</button>
            <button type="button">Inner last</button>
          </FocusScope>
        </Portal>
      </FocusScope>,
    );

    expect(button('Inner first')).toHaveFocus();
    await user.tab();
    await user.tab();

    expect(button('Inner first')).toHaveFocus();
  });
});
