import { virtual } from '@guidepup/virtual-screen-reader';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { TabsActivationMode } from './tabs';
import { Tabs } from './tabs';

function Settings({ activationMode }: { activationMode?: TabsActivationMode }) {
  return (
    <Tabs.Root defaultValue="account" activationMode={activationMode}>
      <Tabs.List aria-label="Settings">
        <Tabs.Tab value="account">Account</Tabs.Tab>
        <Tabs.Tab value="password">Password</Tabs.Tab>
        <Tabs.Tab value="billing" disabled>
          Billing
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="account">
        <p>Account settings</p>
      </Tabs.Panel>
      <Tabs.Panel value="password">
        <p>Password settings</p>
      </Tabs.Panel>
      <Tabs.Panel value="billing">
        <p>Billing settings</p>
      </Tabs.Panel>
    </Tabs.Root>
  );
}

/*
 * Guidepup's virtual screen reader derives speech from the accessibility tree
 * the same way real screen readers do (role, name, state), so these assertions
 * catch regressions in what users hear. It does not replace testing with Orca,
 * NVDA, VoiceOver, or TalkBack; see "What's tested" in the docs.
 */
describe('Tabs announcements', () => {
  afterEach(async () => {
    await virtual.stop();
  });

  it('announces the list, each tab with its state and position, and only the active panel', async () => {
    const { container } = render(<Settings />);

    await virtual.start({ container });
    for (let step = 0; step < 9; step++) await virtual.next();

    expect(await virtual.spokenPhraseLog()).toEqual([
      'tablist, Settings, orientated horizontally',
      'tab, Account, selected, 1 control, position 1, set size 3',
      'tab, Password, not selected, 1 control, position 2, set size 3',
      'tab, Billing, not selected, 1 control, disabled, position 3, set size 3',
      'end of tablist, Settings, orientated horizontally',
      'tabpanel, Account',
      'paragraph',
      'Account settings',
      'end of paragraph',
      'end of tabpanel, Account',
    ]);
  });

  it('announces the newly selected tab when an arrow key moves to it', async () => {
    const { container } = render(<Settings />);

    await virtual.start({ container });
    await virtual.press('Tab');
    expect(await virtual.lastSpokenPhrase()).toBe(
      'tab, Account, selected, 1 control, position 1, set size 3',
    );

    await virtual.press('ArrowRight');
    expect(await virtual.lastSpokenPhrase()).toBe(
      'tab, Password, selected, 1 control, position 2, set size 3',
    );
  });

  it('announces "not selected" while manual mode waits for Enter', async () => {
    const { container } = render(<Settings activationMode="manual" />);

    await virtual.start({ container });
    await virtual.press('Tab');
    await virtual.press('ArrowRight');
    expect(await virtual.lastSpokenPhrase()).toBe(
      'tab, Password, not selected, 1 control, position 2, set size 3',
    );

    await virtual.press('Tab');
    expect(await virtual.lastSpokenPhrase()).toBe('tabpanel, Account');
  });
});
