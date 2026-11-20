import { virtual } from '@guidepup/virtual-screen-reader';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { stubDialogOpenState } from '../../../tests/stub-dialog';
import type { DialogContentProps } from './dialog';
import { Dialog } from './dialog';

stubDialogOpenState();

function Example({ role }: Pick<DialogContentProps, 'role'>) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Delete project</Dialog.Trigger>
      <Dialog.Content role={role}>
        <Dialog.Title>Delete “Atlas”?</Dialog.Title>
        <Dialog.Description>This removes the project and its history.</Dialog.Description>
        <Dialog.Close>Cancel</Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/*
 * Guidepup's virtual screen reader derives speech from the accessibility tree
 * the same way real screen readers do (role, name, state), so these assertions
 * catch regressions in what users hear. It does not replace testing with Orca,
 * NVDA, VoiceOver, or TalkBack; see "What's tested" in the docs.
 *
 * jsdom does not move focus into a dialog the way browsers do (see the stub),
 * so focus placement is asserted in Playwright; here focus lands on the dialog
 * itself, which is what Keyline does when nothing inside is laid out.
 */
describe('Dialog announcements', () => {
  afterEach(async () => {
    await virtual.stop();
  });

  it('announces the trigger with its popup type, and nothing of the closed dialog', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.next();
    await virtual.next();

    expect(await virtual.spokenPhraseLog()).toEqual([
      'button, Delete project, not expanded, has popup dialog',
      'button, Delete project, not expanded, has popup dialog',
      'button, Delete project, not expanded, has popup dialog',
    ]);
  });

  it('announces role, title and description when it opens', async () => {
    const { container } = render(<Example />);

    await virtual.start({ container });
    await virtual.press('Enter');

    expect(await virtual.lastSpokenPhrase()).toBe(
      'dialog, Delete “Atlas”?, This removes the project and its history.',
    );
    await virtual.next();
    expect(await virtual.lastSpokenPhrase()).toBe('heading, Delete “Atlas”?, level 2');
  });

  it('announces an alertdialog as one, assertively', async () => {
    const { container } = render(<Example role="alertdialog" />);

    await virtual.start({ container });
    await virtual.press('Enter');

    expect(await virtual.spokenPhraseLog()).toContain(
      'alertdialog, Delete “Atlas”?, This removes the project and its history.',
    );
    expect(await virtual.spokenPhraseLog()).toContain('assertive: Delete “Atlas”?');
  });
});
