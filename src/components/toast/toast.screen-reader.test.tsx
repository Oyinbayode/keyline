import { virtual } from '@guidepup/virtual-screen-reader';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { stubDialogOpenState } from '../../../tests/stub-dialog';
import { Dialog } from '../dialog/dialog';
import type { ToastApi, ToastOptions } from './toast';
import { ToastProvider, useToast } from './toast';

stubDialogOpenState();

const captured: { api?: ToastApi } = {};

function CaptureApi() {
  const value = useToast();
  useEffect(() => {
    captured.api = value;
  }, [value]);
  return null;
}

function Page() {
  return (
    <ToastProvider>
      <CaptureApi />
      <main>
        <p>Page</p>
        <Dialog.Root>
          <Dialog.Trigger>Open settings</Dialog.Trigger>
          <Dialog.Content aria-label="Settings">
            <Dialog.Close>Close settings</Dialog.Close>
          </Dialog.Content>
        </Dialog.Root>
      </main>
    </ToastProvider>
  );
}

// Guidepup records live-region speech as the DOM mutates; give it a tick to observe.
async function show(options: ToastOptions) {
  act(() => {
    captured.api?.toast(options);
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
}

/*
 * Guidepup's virtual screen reader derives speech from the accessibility tree
 * and live-region mutations the way real screen readers do, so these
 * assertions catch announcements that go missing or happen twice. It does not
 * replace testing with Orca, NVDA, VoiceOver, or TalkBack.
 */
describe('Toast announcements', () => {
  afterEach(async () => {
    await virtual.stop();
  });

  it('announces each toast exactly once, politely or assertively by tone', async () => {
    render(<Page />);
    await virtual.start({ container: document.body });

    await show({ title: 'Saved' });
    await show({ title: 'Upload failed', tone: 'danger' });

    expect(await virtual.spokenPhraseLog()).toEqual([
      'document',
      'polite: Saved',
      'assertive: Error: Upload failed',
    ]);
  });

  it('keeps announcing while a modal dialog is open, without repeating earlier toasts', async () => {
    render(<Page />);
    await virtual.start({ container: document.body });

    await show({ title: 'Saved' });
    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    await show({ title: 'Synced', tone: 'success' });

    expect(await virtual.spokenPhraseLog()).toEqual([
      'document',
      'polite: Saved',
      'dialog, Settings',
      'polite: Success: Synced',
    ]);
  });

  it('reads the landmark, the list and the close button by name in browse mode', async () => {
    render(<Page />);
    await virtual.start({ container: document.body });
    await show({ title: 'Saved', tone: 'warning' });

    for (let step = 0; step < 20; step++) await virtual.next();
    const log = await virtual.spokenPhraseLog();

    expect(log).toContain('region, Notifications (F8)');
    expect(log).toContain('list');
    expect(log).toContain('listitem, level 1, position 1, set size 1');
    expect(log).toContain('image, Warning');
    expect(log).toContain('button, Dismiss: Saved');
  });

  it('never reads the slug line: the tone once through the icon, no state words', async () => {
    render(<Page />);
    await virtual.start({ container: document.body });
    await show({ title: 'Saved', tone: 'warning' });
    await show({ title: 'Archived', action: { label: 'Undo', onClick: () => {} } });

    for (let step = 0; step < 30; step++) await virtual.next();
    const log = await virtual.spokenPhraseLog();

    // Reached the held toast too, so the absence of its state word means something.
    expect(log).toContain('button, Dismiss: Archived');
    expect(log.filter((phrase) => /^(image, )?Warning$/.test(phrase))).toEqual(['image, Warning']);
    expect(log.some((phrase) => /\b(Note|Held|Paused)\b/i.test(phrase))).toBe(false);
  });
});
