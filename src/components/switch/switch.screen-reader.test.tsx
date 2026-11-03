import { virtual } from '@guidepup/virtual-screen-reader';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Switch } from './switch';

/*
 * Guidepup's virtual screen reader derives speech from the accessibility tree
 * the same way real screen readers do (role, name, state), so these assertions
 * catch regressions in what users hear. It does not replace testing with Orca,
 * NVDA, VoiceOver, or TalkBack; see "What's tested" in the docs.
 */
describe('Switch announcements', () => {
  afterEach(async () => {
    await virtual.stop();
  });

  it('announces role, label, and state', async () => {
    const { container } = render(
      <>
        <label>
          Wi-Fi <Switch />
        </label>
        <Switch aria-label="Bluetooth" defaultChecked />
        <Switch aria-label="Airplane mode" disabled />
      </>,
    );

    await virtual.start({ container });
    await virtual.next();
    expect(await virtual.lastSpokenPhrase()).toBe('switch, Wi-Fi, not checked');

    await virtual.next();
    expect(await virtual.lastSpokenPhrase()).toBe('switch, Bluetooth, checked');

    await virtual.next();
    expect(await virtual.lastSpokenPhrase()).toBe('switch, Airplane mode, not checked, disabled');
  });

  it('announces the new state after toggling with Enter or Space', async () => {
    const { container } = render(<Switch aria-label="Wi-Fi" />);

    await virtual.start({ container });
    expect(await virtual.lastSpokenPhrase()).toBe('switch, Wi-Fi, not checked');

    await virtual.press('Enter');
    expect(await virtual.lastSpokenPhrase()).toBe('switch, Wi-Fi, checked');

    // Guidepup forwards keys to user-event, which names the space bar ' '.
    await virtual.press(' ');
    expect(await virtual.lastSpokenPhrase()).toBe('switch, Wi-Fi, not checked');
  });
});
