import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

function openStory(page: Page, storyName: string) {
  return page.goto(`/iframe.html?id=components-switch--${storyName}&viewMode=story`);
}

function focusRing(locator: Locator) {
  return locator.evaluate((element) => {
    const { outlineStyle, outlineWidth } = getComputedStyle(element);
    return { outlineStyle, outlineWidth };
  });
}

test.describe('Switch keyboard support', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  test('Tab moves focus onto the switch', async ({ page }) => {
    await page.getByRole('button', { name: 'Before' }).focus();
    await page.keyboard.press('Tab');

    await expect(page.getByRole('switch', { name: 'Wi-Fi' })).toBeFocused();
  });

  test('Space toggles the switch on and off', async ({ page }) => {
    const wifi = page.getByRole('switch', { name: 'Wi-Fi' });
    await page.getByRole('button', { name: 'Before' }).focus();
    await page.keyboard.press('Tab');

    await page.keyboard.press('Space');
    await expect(wifi).toHaveAttribute('aria-checked', 'true');

    await page.keyboard.press('Space');
    await expect(wifi).toHaveAttribute('aria-checked', 'false');
    await expect(wifi).toBeFocused();
  });

  test('Enter toggles the switch on and off', async ({ page }) => {
    const wifi = page.getByRole('switch', { name: 'Wi-Fi' });
    await page.getByRole('button', { name: 'Before' }).focus();
    await page.keyboard.press('Tab');

    await page.keyboard.press('Enter');
    await expect(wifi).toHaveAttribute('aria-checked', 'true');

    await page.keyboard.press('Enter');
    await expect(wifi).toHaveAttribute('aria-checked', 'false');
  });

  test('a disabled switch is skipped in the tab order and cannot be toggled', async ({ page }) => {
    const airplaneMode = page.getByRole('switch', { name: 'Airplane mode' });
    await page.getByRole('switch', { name: 'Wi-Fi' }).focus();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'After' })).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('switch', { name: 'Wi-Fi' })).toBeFocused();

    await expect(airplaneMode).toBeDisabled();
    await airplaneMode.click({ force: true });
    await expect(airplaneMode).toHaveAttribute('aria-checked', 'false');
  });

  test('clicking the label text toggles the switch', async ({ page }) => {
    await page.getByText('Wi-Fi', { exact: true }).click();

    await expect(page.getByRole('switch', { name: 'Wi-Fi' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

test.describe('Switch focus and display preferences', () => {
  test('shows a focus ring for keyboard focus but not for mouse clicks', async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
    const wifi = page.getByRole('switch', { name: 'Wi-Fi' });

    await wifi.click();
    expect((await focusRing(wifi)).outlineStyle).toBe('none');

    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    expect(await focusRing(wifi)).toEqual({ outlineStyle: 'solid', outlineWidth: '2px' });
  });

  test('drops the thumb animation when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'keyboard-fixture');

    const thumbDurations = await page
      .getByRole('switch', { name: 'Wi-Fi' })
      .locator('.kl-switch-thumb')
      .evaluate((thumb) => getComputedStyle(thumb).transitionDuration);

    expect(thumbDurations.split(',').map((duration) => duration.trim())).toEqual(['0s', '0s']);
  });

  test('slides the thumb towards the inline end in right-to-left layouts', async ({ page }) => {
    await openStory(page, 'right-to-left');
    const checkedThumb = page.getByRole('switch', { checked: true }).locator('.kl-switch-thumb');

    const translateX = await checkedThumb.evaluate(
      (thumb) => new DOMMatrixReadOnly(getComputedStyle(thumb).transform).m41,
    );

    expect(translateX).toBeLessThan(0);
  });

  test('keeps on and off distinguishable in forced-colours mode', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Only Chromium can emulate forced-colors.');
    await page.emulateMedia({ forcedColors: 'active' });
    await openStory(page, 'states');

    const trackColour = (name: string) =>
      page
        .getByRole('switch', { name, exact: true })
        .evaluate((element) => getComputedStyle(element).backgroundColor);
    const highlight = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'Highlight';
      document.body.append(probe);
      const colour = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return colour;
    });

    expect(await trackColour('On')).toBe(highlight);
    expect(await trackColour('Off')).not.toBe(highlight);
  });
});
