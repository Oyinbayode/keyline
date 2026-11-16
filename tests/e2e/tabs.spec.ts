import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

function openStory(page: Page, storyName: string) {
  return page.goto(`/iframe.html?id=components-tabs--${storyName}&viewMode=story`);
}

const tabs = (page: Page, list: string) => page.getByRole('tablist', { name: list, exact: true });

test.describe('Tabs keyboard support', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  test('Tab enters on the selected tab and leaves for its panel', async ({ page }) => {
    const settings = tabs(page, 'Settings');
    await page.getByRole('button', { name: 'Before' }).focus();

    await page.keyboard.press('Tab');
    await expect(settings.getByRole('tab', { name: 'Account' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('tabpanel', { name: 'Account' }).first()).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(settings.getByRole('tab', { name: 'Account' })).toBeFocused();
  });

  test('arrow keys select as they move, skipping disabled tabs and wrapping', async ({ page }) => {
    const settings = tabs(page, 'Settings');
    await settings.getByRole('tab', { name: 'Account' }).focus();

    await page.keyboard.press('ArrowRight');
    const billing = settings.getByRole('tab', { name: 'Billing' });
    await expect(billing).toBeFocused();
    await expect(billing).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(settings.getByRole('tab', { name: 'Account' })).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(billing).toBeFocused();
  });

  test('Home and End jump to the first and last tabs', async ({ page }) => {
    const settings = tabs(page, 'Settings');
    await settings.getByRole('tab', { name: 'Account' }).focus();

    await page.keyboard.press('End');
    await expect(settings.getByRole('tab', { name: 'Billing' })).toBeFocused();

    await page.keyboard.press('Home');
    await expect(settings.getByRole('tab', { name: 'Account' })).toBeFocused();
  });

  test('manual activation waits for Enter or Space', async ({ page }) => {
    const manual = tabs(page, 'Manual settings');
    const account = manual.getByRole('tab', { name: 'Account' });
    const password = manual.getByRole('tab', { name: 'Password' });
    const billing = manual.getByRole('tab', { name: 'Billing' });
    await account.focus();

    await page.keyboard.press('ArrowRight');
    await expect(password).toBeFocused();
    await expect(account).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Enter');
    await expect(password).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(billing).toHaveAttribute('aria-selected', 'true');
  });

  test('vertical tabs move with Up and Down, not Left and Right', async ({ page }) => {
    const vertical = tabs(page, 'Vertical settings');
    await vertical.getByRole('tab', { name: 'Account' }).focus();

    await page.keyboard.press('ArrowRight');
    await expect(vertical.getByRole('tab', { name: 'Account' })).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(vertical.getByRole('tab', { name: 'Password' })).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await expect(vertical.getByRole('tab', { name: 'Account' })).toBeFocused();
  });

  test('arrow keys are consumed, so they never scroll the page', async ({ page }) => {
    await tabs(page, 'Vertical settings').getByRole('tab', { name: 'Account' }).focus();
    await page.evaluate(() => {
      document.addEventListener('keydown', (event) => {
        document.body.dataset.lastKeyPrevented = String(event.defaultPrevented);
      });
    });

    await page.keyboard.press('ArrowDown');

    await expect(page.locator('body')).toHaveAttribute('data-last-key-prevented', 'true');
  });
});

test.describe('Tabs focus and display preferences', () => {
  test('hides inactive panels from the page and the accessibility tree', async ({ page }) => {
    await openStory(page, 'horizontal');

    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.getByText('Change your password')).toBeHidden();
  });

  test('shows a focus ring for keyboard focus but not for mouse clicks', async ({ page }) => {
    await openStory(page, 'horizontal');
    const password = page.getByRole('tab', { name: 'Password' });
    const boxShadow = () => password.evaluate((tab) => getComputedStyle(tab).boxShadow);

    await password.click();
    expect(await boxShadow()).toBe('none');

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    expect(await boxShadow()).toContain('0px 0px 0px 4px');
  });

  test('marks the selected tab with a 2px keyline on the block end', async ({ page }) => {
    await openStory(page, 'horizontal');
    const border = (name: string) =>
      page.getByRole('tab', { name }).evaluate((tab) => {
        const style = getComputedStyle(tab);
        return { width: style.borderBottomWidth, colour: style.borderBottomColor };
      });

    const selected = await border('Account');
    const unselected = await border('Password');

    expect(selected.width).toBe('2px');
    expect(selected.colour).not.toBe(unselected.colour);
    expect(unselected.colour).toBe('rgba(0, 0, 0, 0)');
  });

  test('marks a vertical tab with a keyline under its label, never a bar on one side', async ({
    page,
  }) => {
    await openStory(page, 'vertical');
    const shape = (name: string) =>
      page.getByRole('tab', { name }).evaluate((tab) => {
        const label = tab.querySelector('.kl-tab-label') as HTMLElement;
        const tabStyle = getComputedStyle(tab);
        const labelStyle = getComputedStyle(label);
        return {
          tabSides: [tabStyle.borderLeftWidth, tabStyle.borderRightWidth],
          underline: labelStyle.borderBottomWidth,
          underlineColour: labelStyle.borderBottomColor,
          labelWidth: label.getBoundingClientRect().width,
          textWidth: (() => {
            const range = document.createRange();
            range.selectNodeContents(label);
            return range.getBoundingClientRect().width;
          })(),
        };
      });

    const selected = await shape('Account');
    const unselected = await shape('Password');

    expect(selected.tabSides).toEqual(['0px', '0px']);
    expect(selected.underline).toBe('2px');
    expect(selected.labelWidth).toBeCloseTo(selected.textWidth, 0);
    expect(selected.underlineColour).not.toBe(unselected.underlineColour);
    expect(unselected.underlineColour).toBe('rgba(0, 0, 0, 0)');
  });

  test('separates a vertical list from its panel with space, not a divider', async ({ page }) => {
    await openStory(page, 'vertical');

    const layout = await page.getByRole('tablist').evaluate((list) => {
      const style = getComputedStyle(list);
      const panel = document.querySelector('[role="tabpanel"]:not([hidden])') as HTMLElement;
      return {
        borders: [style.borderLeftWidth, style.borderRightWidth, style.borderBottomWidth],
        gap: panel.getBoundingClientRect().left - list.getBoundingClientRect().right,
        tabStarts: [...list.querySelectorAll('[role="tab"]')].map(
          (tab) => tab.getBoundingClientRect().left - list.getBoundingClientRect().left,
        ),
      };
    });

    expect(layout.borders).toEqual(['0px', '0px', '0px']);
    expect(layout.gap).toBeGreaterThanOrEqual(32);
    expect(new Set(layout.tabStarts)).toEqual(new Set([0]));
  });

  test('flips Left and Right in right-to-left layouts', async ({ page }) => {
    await openStory(page, 'right-to-left');
    const first = page.getByRole('tab', { name: 'الحساب' });
    await first.focus();

    await page.keyboard.press('ArrowLeft');

    await expect(page.getByRole('tab', { name: 'كلمة المرور' })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'كلمة المرور' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('drops colour transitions when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'horizontal');

    const durations = await page
      .getByRole('tab', { name: 'Account' })
      .evaluate((tab) => getComputedStyle(tab).transitionDuration);

    expect(durations.split(',').map((duration) => duration.trim())).toEqual(['0s', '0s']);
  });

  test('keeps the vertical label keyline in forced-colours mode', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Only Chromium can emulate forced-colors.');
    await page.emulateMedia({ forcedColors: 'active' });
    await openStory(page, 'vertical');

    const highlight = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'Highlight';
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    });
    const underline = (name: string) =>
      page
        .getByRole('tab', { name })
        .locator('.kl-tab-label')
        .evaluate((label) => getComputedStyle(label).borderBottomColor);

    expect(await underline('Account')).toBe(highlight);
    expect(await underline('Password')).not.toBe(highlight);
  });

  test('keeps the selected keyline in forced-colours mode', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Only Chromium can emulate forced-colors.');
    await page.emulateMedia({ forcedColors: 'active' });
    await openStory(page, 'horizontal');

    const highlight = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'Highlight';
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    });
    const keyline = (name: string) =>
      page.getByRole('tab', { name }).evaluate((tab) => getComputedStyle(tab).borderBottomColor);

    expect(await keyline('Account')).toBe(highlight);
    expect(await keyline('Password')).not.toBe(highlight);
  });
});
