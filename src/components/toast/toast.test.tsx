import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { stubDialogOpenState } from '../../../tests/stub-dialog';
import { Dialog } from '../dialog/dialog';
import type { ToastApi, ToastOptions, ToastProviderProps } from './toast';
import { Toast, ToastProvider, useToast } from './toast';

stubDialogOpenState();

const captured: { api?: ToastApi } = {};
const api: ToastApi = {
  toast: (options) => captured.api?.toast(options) ?? '',
  dismiss: (id) => captured.api?.dismiss(id),
};

function CaptureApi() {
  const value = useToast();
  useEffect(() => {
    captured.api = value;
  }, [value]);
  return null;
}

function renderProvider(props: Omit<ToastProviderProps, 'children'> = {}, extra?: ReactNode) {
  return render(
    <ToastProvider {...props}>
      <CaptureApi />
      <main>
        <label>
          Message <input />
        </label>
        {extra}
      </main>
    </ToastProvider>,
  );
}

function show(options: ToastOptions) {
  let id = '';
  act(() => {
    id = api.toast(options);
  });
  return id;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const viewport = () => screen.getByRole('region', { name: 'Notifications (F8)' });
const polite = () => screen.getByRole('status');
const assertive = () => screen.getByRole('alert');
const toasts = () => within(viewport()).queryAllByRole('listitem');
const fuseOf = (item: Element | undefined) => item?.querySelector<HTMLElement>('.kl-toast-fuse');

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  describe('structure and announcements', () => {
    it('renders both live regions, empty, before any toast exists', () => {
      renderProvider();

      expect(polite()).toBeEmptyDOMElement();
      expect(assertive()).toBeEmptyDOMElement();
      expect(polite()).toHaveAttribute('aria-atomic', 'false');
      expect(viewport()).toContainElement(polite());
      expect(within(viewport()).getByRole('list')).toBeEmptyDOMElement();
    });

    it('lists toasts in an ordered list inside a labelled region landmark', () => {
      renderProvider({ label: 'Alerts' });
      show({ title: 'Saved' });

      const region = screen.getByRole('region', { name: 'Alerts (F8)' });
      expect(within(region).getByRole('list').tagName).toBe('OL');
      expect(within(region).getByRole('listitem')).toHaveTextContent('Saved');
    });

    it('announces neutral, success and warning politely, and danger assertively', () => {
      renderProvider({ limit: 5 });

      show({ title: 'Draft saved' });
      show({ title: 'Published', tone: 'success' });
      show({ title: 'Storage almost full', description: '92% used', tone: 'warning' });
      show({ title: 'Upload failed', tone: 'danger' });

      expect(polite()).toHaveTextContent(
        'Draft savedSuccess: PublishedWarning: Storage almost full 92% used',
      );
      expect(assertive()).toHaveTextContent('Error: Upload failed');
    });

    it('keeps the visible toast out of every live region, so nothing is read twice', () => {
      renderProvider();
      show({ title: 'Saved' });

      const item = toasts()[0];
      expect(item?.closest('[role="status"], [role="alert"], [aria-live]')).toBeNull();
      expect(polite()).not.toContainElement(item ?? null);
    });

    it('clears the announcement shortly after, leaving the toast on screen', () => {
      renderProvider();
      show({ title: 'Saved' });

      advance(1000);

      expect(polite()).toBeEmptyDOMElement();
      expect(toasts()).toHaveLength(1);
    });

    it('never takes focus when a toast appears', () => {
      renderProvider();
      const input = screen.getByRole('textbox', { name: 'Message' });
      input.focus();

      show({ title: 'Saved', action: { label: 'Undo', onClick: () => {} } });

      expect(input).toHaveFocus();
    });

    it('marks the tone with a labelled icon, and hides the neutral one', () => {
      renderProvider({ limit: 4 });
      show({ title: 'Neutral' });
      show({ title: 'Careful', tone: 'warning' });

      const [neutral, warning] = toasts();
      expect(neutral).toHaveAttribute('data-tone', 'neutral');
      expect(neutral?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(within(warning as HTMLElement).getByRole('img', { name: 'Warning' })).toBeVisible();
      expect(warning).toHaveAttribute('data-tone', 'warning');
    });

    it('names the close button after the toast', () => {
      renderProvider();
      show({ title: 'Invite sent' });

      expect(screen.getByRole('button', { name: 'Dismiss: Invite sent' })).toBeInTheDocument();
    });

    it('throws a helpful error when useToast is used outside ToastProvider', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<CaptureApi />)).toThrow('useToast must be inside ToastProvider');
    });
  });

  describe('timing', () => {
    it('dismisses itself after the default 6000 ms', () => {
      renderProvider();
      show({ title: 'Saved' });

      advance(5999);
      expect(toasts()).toHaveLength(1);

      advance(1);
      advance(0);
      expect(toasts()).toHaveLength(0);
    });

    it('raises durations under 5000 ms to 5000 ms and warns in development', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      renderProvider();
      show({ title: 'Quick', duration: 1000 });

      advance(4999);
      expect(toasts()).toHaveLength(1);
      expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('5000 ms minimum'));

      advance(1);
      advance(0);
      expect(toasts()).toHaveLength(0);
    });

    it('never dismisses a toast that has an action', () => {
      renderProvider();
      show({ title: 'Message archived', action: { label: 'Undo', onClick: () => {} } });

      advance(60_000);

      expect(toasts()).toHaveLength(1);
    });

    it('pauses while the pointer is over the toasts and resumes with the time left', () => {
      renderProvider();
      show({ title: 'Saved' });
      advance(4000);

      fireEvent.pointerEnter(viewport());
      advance(10_000);
      expect(toasts()).toHaveLength(1);

      fireEvent.pointerLeave(viewport());
      advance(1999);
      expect(toasts()).toHaveLength(1);
      advance(1);
      advance(0);
      expect(toasts()).toHaveLength(0);
    });

    it('pauses while focus is inside the viewport', () => {
      renderProvider();
      show({ title: 'Saved' });

      act(() => {
        screen.getByRole('button', { name: 'Dismiss: Saved' }).focus();
      });
      advance(20_000);
      expect(toasts()).toHaveLength(1);

      act(() => {
        screen.getByRole('textbox', { name: 'Message' }).focus();
      });
      advance(6000);
      advance(0);
      expect(toasts()).toHaveLength(0);
    });

    it('pauses while the window is in the background or the tab is hidden', () => {
      renderProvider();
      show({ title: 'Saved' });

      act(() => {
        window.dispatchEvent(new Event('blur'));
      });
      advance(20_000);
      expect(toasts()).toHaveLength(1);

      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      advance(5000);
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      advance(20_000);
      expect(toasts()).toHaveLength(1);
    });

    it('queues toasts above the limit and announces each one only when it shows', () => {
      renderProvider({ limit: 2 });
      show({ title: 'First' });
      show({ title: 'Second' });
      show({ title: 'Third' });

      expect(toasts()).toHaveLength(2);
      expect(polite()).not.toHaveTextContent('Third');

      act(() => {
        api.dismiss(toasts()[0]?.id);
      });
      advance(0);

      expect(toasts().map((item) => item.querySelector('.kl-toast-title')?.textContent)).toEqual([
        'Second',
        'Third',
      ]);
      expect(polite()).toHaveTextContent('Third');
    });
  });

  describe('dismissing', () => {
    // fireEvent, not user-event: RTL's async wrapper waits on a real timer, which fake timers freeze.
    it('runs the action and dismisses the toast', () => {
      const onUndo = vi.fn();
      renderProvider();
      show({ title: 'Message archived', action: { label: 'Undo', onClick: onUndo } });

      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      advance(0);

      expect(onUndo).toHaveBeenCalledOnce();
      expect(toasts()).toHaveLength(0);
    });

    it('dismisses one toast by id, or all without one', () => {
      renderProvider();
      const first = show({ title: 'First' });
      show({ title: 'Second' });
      show({ title: 'Third' });

      act(() => {
        api.dismiss(first);
      });
      advance(0);
      expect(toasts()).toHaveLength(2);

      act(() => {
        api.dismiss();
      });
      advance(0);
      expect(toasts()).toHaveLength(0);
    });

    it('marks a dismissed toast closed before removing it, for the exit transition', () => {
      renderProvider();
      const id = show({ title: 'Saved' });

      act(() => {
        api.dismiss(id);
      });

      expect(toasts()[0]).toHaveAttribute('data-state', 'closed');
      advance(0);
      expect(toasts()).toHaveLength(0);
    });

    it('dismisses the focused toast with Esc and moves focus to the next toast', () => {
      renderProvider();
      show({ title: 'First' });
      show({ title: 'Second' });
      const close = screen.getByRole('button', { name: 'Dismiss: First' });
      act(() => {
        close.focus();
      });

      fireEvent.keyDown(close, { key: 'Escape' });
      advance(0);

      expect(toasts().map((item) => item.querySelector('.kl-toast-title')?.textContent)).toEqual([
        'Second',
      ]);
      expect(toasts()[0]).toHaveFocus();
    });

    it('returns focus to where it was before the viewport when the last focused toast goes', () => {
      renderProvider();
      const input = screen.getByRole('textbox', { name: 'Message' });
      show({ title: 'Saved' });
      input.focus();

      fireEvent.keyDown(input, { key: 'F8' });
      expect(viewport()).toHaveFocus();
      const close = screen.getByRole('button', { name: 'Dismiss: Saved' });
      act(() => {
        close.focus();
      });

      fireEvent.click(close);
      advance(0);

      expect(input).toHaveFocus();
    });

    it('stops Esc in a toast from reaching anything else', () => {
      renderProvider();
      show({ title: 'Saved' });
      const escape = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        screen.getByRole('button', { name: 'Dismiss: Saved' }).dispatchEvent(escape);
      });

      expect(escape.defaultPrevented).toBe(true);
    });
  });

  describe('F8', () => {
    it('focuses the viewport when there are toasts, and does nothing otherwise', () => {
      renderProvider();
      const input = screen.getByRole('textbox', { name: 'Message' });
      input.focus();

      fireEvent.keyDown(input, { key: 'F8' });
      expect(input).toHaveFocus();

      show({ title: 'Saved' });
      fireEvent.keyDown(input, { key: 'F8' });
      expect(viewport()).toHaveFocus();
    });
  });

  describe('slug line and fuse', () => {
    it('shows the tone name and timer state as hidden chrome, so the tone is read once', () => {
      renderProvider();
      show({ title: 'Storage almost full', tone: 'warning' });
      const item = toasts()[0] as HTMLElement;

      expect(within(item).getByText('Warning', { selector: 'span' })).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(within(item).getAllByRole('img', { name: 'Warning' })).toHaveLength(1);
      expect(within(item).queryByText('Warning', { ignore: '[aria-hidden="true"]' })).toBeNull();
      expect(item.querySelector('.kl-toast-state')).toHaveAttribute('aria-hidden', 'true');
    });

    it('names the neutral tone in the slug but neither labels its icon nor announces it', () => {
      renderProvider();
      show({ title: 'Draft saved' });

      expect(within(toasts()[0] as HTMLElement).getByText('Note')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(polite()).toHaveTextContent(/^Draft saved$/);
    });

    it('marks the timer running, paused, or held, with the state word to match', () => {
      renderProvider({ limit: 4 });
      show({ title: 'Saved' });
      show({ title: 'Archived', action: { label: 'Undo', onClick: () => {} } });
      const [timed, held] = toasts();

      expect(timed).toHaveAttribute('data-timer', 'running');
      expect(timed?.querySelector('.kl-toast-state')).toBeEmptyDOMElement();
      expect(held).toHaveAttribute('data-timer', 'held');
      expect(held?.querySelector('.kl-toast-state')).toHaveTextContent('Held');

      fireEvent.pointerEnter(viewport());
      expect(timed).toHaveAttribute('data-timer', 'paused');
      expect(timed?.querySelector('.kl-toast-state')).toHaveTextContent('Paused');
      expect(held).toHaveAttribute('data-timer', 'held');
    });

    it('takes tone, paused, and held labels from the provider, for localisation', () => {
      renderProvider({
        limit: 4,
        toneLabels: { warning: 'Avertissement' },
        pausedLabel: 'En pause',
        heldLabel: 'Retenu',
      });
      show({ title: 'Stockage presque plein', tone: 'warning' });
      show({ title: 'Archivé', action: { label: 'Annuler', onClick: () => {} } });
      fireEvent.pointerEnter(viewport());
      const [warning, held] = toasts();

      expect(
        within(warning as HTMLElement).getByRole('img', { name: 'Avertissement' }),
      ).toBeVisible();
      expect(warning?.querySelector('.kl-toast-state')).toHaveTextContent('En pause');
      expect(held?.querySelector('.kl-toast-state')).toHaveTextContent('Retenu');
      expect(polite()).toHaveTextContent('Avertissement: Stockage presque plein');
    });

    it('draws a fuse only on toasts with a countdown', () => {
      renderProvider({ limit: 4 });
      show({ title: 'Saved' });
      show({ title: 'Archived', action: { label: 'Undo', onClick: () => {} } });
      const [timed, held] = toasts();

      expect(fuseOf(timed)).toHaveAttribute('aria-hidden', 'true');
      expect(fuseOf(held)).toBeNull();
    });

    it('burns the fuse from the timer: full, then down over the remaining time', () => {
      renderProvider();
      show({ title: 'Saved' });

      expect(fuseOf(toasts()[0])).toHaveStyle({
        transform: 'scaleX(0)',
        transitionDuration: '6000ms',
      });
    });

    it('freezes the fuse at the share left while paused, and resumes from there', () => {
      renderProvider();
      show({ title: 'Saved' });
      advance(3000);

      fireEvent.pointerEnter(viewport());
      expect(fuseOf(toasts()[0])).toHaveStyle({
        transform: 'scaleX(0.5)',
        transitionDuration: '0ms',
      });

      advance(10_000);
      fireEvent.pointerLeave(viewport());
      expect(fuseOf(toasts()[0])).toHaveStyle({
        transform: 'scaleX(0)',
        transitionDuration: '3000ms',
      });
    });
  });

  describe('custom layout', () => {
    it('renders toasts from the parts with renderToast', () => {
      renderProvider({
        renderToast: (toast) => (
          <Toast.Root className="custom">
            <Toast.Title>{toast.title.toUpperCase()}</Toast.Title>
            <Toast.Description />
            <Toast.Action />
            <Toast.Close>Hide</Toast.Close>
          </Toast.Root>
        ),
      });
      show({
        title: 'Saved',
        description: 'All changes stored',
        action: { label: 'View', onClick: () => {} },
      });

      const item = toasts()[0] as HTMLElement;
      expect(item).toHaveClass('kl-toast', 'custom');
      expect(within(item).getByText('SAVED')).toHaveClass('kl-toast-title');
      expect(within(item).getByText('All changes stored')).toHaveClass('kl-toast-description');
      expect(within(item).getByRole('button', { name: 'View' })).toBeInTheDocument();
      expect(within(item).getByRole('button', { name: 'Dismiss: Saved' })).toHaveTextContent(
        'Hide',
      );
    });

    it('throws a helpful error when a part is used outside a toast', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<Toast.Close />)).toThrow('Toast.Close must be inside a toast');
    });
  });

  describe('inside a modal dialog', () => {
    function WithDialog() {
      return (
        <Dialog.Root>
          <Dialog.Trigger>Open settings</Dialog.Trigger>
          <Dialog.Content aria-label="Settings">
            <Dialog.Close>Close settings</Dialog.Close>
          </Dialog.Content>
        </Dialog.Root>
      );
    }

    it('moves the viewport and its live regions into the open dialog, and back', () => {
      renderProvider({}, <WithDialog />);
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      expect(dialog).not.toContainElement(viewport());

      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
      expect(dialog).toContainElement(viewport());
      expect(dialog).toContainElement(polite());

      fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
      expect(dialog).not.toContainElement(viewport());
      expect(viewport().parentElement).toBe(document.body);
    });

    it('does not repeat an announcement when the regions move, but announces new toasts there', () => {
      renderProvider({ limit: 4 }, <WithDialog />);
      show({ title: 'Before the dialog' });
      expect(polite()).toHaveTextContent('Before the dialog');

      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
      expect(polite()).toBeEmptyDOMElement();
      expect(toasts()).toHaveLength(1);

      show({ title: 'While the dialog is open' });
      expect(polite()).toHaveTextContent('While the dialog is open');
      expect(document.querySelector('dialog')).toContainElement(polite());
    });

    it('keeps the fuse where it was when the toasts move', () => {
      renderProvider({}, <WithDialog />);
      show({ title: 'Saved' });
      advance(1500);
      fireEvent.pointerEnter(viewport());

      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));

      expect(fuseOf(toasts()[0])).toHaveStyle({ transform: 'scaleX(0.75)' });
    });

    it('keeps the remaining time when the toasts move', () => {
      renderProvider({}, <WithDialog />);
      show({ title: 'Saved' });
      advance(4000);

      fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
      advance(2000);
      advance(0);

      expect(toasts()).toHaveLength(0);
    });
  });

  describe('axe', () => {
    it.each<[string, ToastOptions[]]>([
      ['empty', []],
      [
        'showing every tone',
        [
          { title: 'Draft saved' },
          { title: 'Published', tone: 'success' },
          { title: 'Storage almost full', description: '92% used', tone: 'warning' },
          { title: 'Upload failed', tone: 'danger' },
        ],
      ],
      ['with an action', [{ title: 'Archived', action: { label: 'Undo', onClick: () => {} } }]],
    ])('has no violations when %s', async (_, list) => {
      vi.useRealTimers();
      const { container } = renderProvider({ limit: 4 });
      list.forEach(show);

      expect(await axe(container.ownerDocument.body)).toHaveNoViolations();
    });
  });
});
