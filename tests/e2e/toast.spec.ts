import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function openStory(page: Page, storyName: string) {
  // A fake clock, so the 6-second timers can be fast-forwarded instead of waited out.
  await page.clock.install();
  await page.goto(`/iframe.html?id=components-toast--${storyName}&viewMode=story`);
  // Installed clocks keep running in real time; pause so a slow machine cannot spend a toast's time.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const viewport = (page: Page) => page.getByRole('region', { name: 'Notifications (F8)' });
const toasts = (page: Page) => viewport(page).getByRole('listitem');

// A dismissed toast is removed after its exit transition, on the paused clock too.
async function settle(page: Page) {
  await page.waitForTimeout(50);
  await page.clock.runFor(400);
}

test.describe('Toast focus', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  test('never takes focus, even mid-typing', async ({ page }) => {
    await button(page, 'Show in half a second').click();
    const input = page.getByRole('textbox', { name: 'Message' });
    await input.click();
    await page.keyboard.type('Hel');

    await page.clock.runFor(600);
    await expect(toasts(page)).toHaveCount(1);
    await page.keyboard.type('lo');

    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Hello');
  });

  test('F8 jumps to the notifications landmark, and Tab reaches each toast’s buttons', async ({
    page,
  }) => {
    await button(page, 'Show with action').click();
    await page.getByRole('textbox', { name: 'Message' }).focus();

    await page.keyboard.press('F8');
    await expect(viewport(page)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(button(page, 'Undo')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button(page, 'Dismiss: Archived')).toBeFocused();
  });

  test('Esc dismisses the focused toast; focus moves to the next, then back', async ({ page }) => {
    await button(page, 'Show neutral').click();
    await button(page, 'Show with action').click();
    const input = page.getByRole('textbox', { name: 'Message' });
    await input.focus();

    await page.keyboard.press('F8');
    await page.keyboard.press('Tab');
    await expect(button(page, 'Dismiss: Draft saved')).toBeFocused();

    await page.keyboard.press('Escape');
    await settle(page);
    await expect(toasts(page)).toHaveCount(1);
    await expect(toasts(page).first()).toBeFocused();

    await page.keyboard.press('Escape');
    await settle(page);
    await expect(toasts(page)).toHaveCount(0);
    await expect(input).toBeFocused();
  });
});

test.describe('Toast timing', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  test('dismisses itself after 6 seconds', async ({ page }) => {
    await button(page, 'Show neutral').click();

    await page.clock.runFor(5900);
    await expect(toasts(page)).toHaveCount(1);

    await page.clock.runFor(600);
    await settle(page);
    await expect(toasts(page)).toHaveCount(0);
  });

  test('waits while the pointer is over it, then finishes the remaining time', async ({ page }) => {
    await button(page, 'Show neutral').click();
    await page.clock.runFor(3000);

    await toasts(page).first().hover();
    await page.clock.runFor(20_000);
    await expect(toasts(page)).toHaveCount(1);

    await page.mouse.move(5, 5);
    await page.clock.runFor(2500);
    await expect(toasts(page)).toHaveCount(1);
    await page.clock.runFor(1000);
    await settle(page);
    await expect(toasts(page)).toHaveCount(0);
  });

  test('waits while focus is inside it', async ({ page }) => {
    await button(page, 'Show neutral').click();
    await page.keyboard.press('F8');

    await page.clock.runFor(20_000);

    await expect(toasts(page)).toHaveCount(1);
  });

  test('never dismisses a toast with an action', async ({ page }) => {
    await button(page, 'Show with action').click();

    await page.clock.runFor(120_000);

    await expect(toasts(page)).toHaveCount(1);
  });
});

test.describe('Toast slug state and fuse', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  // innerText, not textContent: the slug is uppercased by CSS, and that is what people read.
  const slugText = (page: Page) =>
    toasts(page)
      .first()
      .locator('.kl-toast-slug')
      .evaluate((slug) => (slug as HTMLElement).innerText.replace(/\s+/g, '\n'));

  const fuse = (page: Page) =>
    toasts(page)
      .first()
      .locator('.kl-toast-fuse')
      .evaluate((element) => ({
        transform: element.style.transform,
        duration: element.style.transitionDuration,
      }));

  test('burns down over the countdown, freezes on hover with PAUSED, resumes from there', async ({
    page,
  }) => {
    await button(page, 'Show neutral').click();
    expect(await fuse(page)).toEqual({ transform: 'scaleX(0)', duration: '6000ms' });
    await page.clock.runFor(3000);

    await toasts(page).first().hover();
    expect(await fuse(page)).toEqual({ transform: 'scaleX(0.5)', duration: '0ms' });
    await expect(toasts(page).first().locator('.kl-toast-state')).toHaveText('Paused');

    await page.clock.runFor(20_000);
    await page.mouse.move(5, 5);
    expect(await fuse(page)).toEqual({ transform: 'scaleX(0)', duration: '3000ms' });
    await expect(toasts(page).first().locator('.kl-toast-state')).toHaveText('');
  });

  test('shows PAUSED while focus is in the landmark', async ({ page }) => {
    await button(page, 'Show neutral').click();
    await page.keyboard.press('F8');

    await expect(toasts(page).first()).toHaveAttribute('data-timer', 'paused');
    expect(await slugText(page)).toBe('NOTE\nPAUSED');
  });

  test('shows HELD and no fuse on a toast with an action', async ({ page }) => {
    await button(page, 'Show with action').click();

    expect(await slugText(page)).toBe('NOTE\nHELD');
    await expect(toasts(page).first().locator('.kl-toast-fuse')).toHaveCount(0);
  });

  test('burns towards the inline start, so it flips in RTL', async ({ page }) => {
    await button(page, 'Show neutral').click();
    const origin = () =>
      toasts(page)
        .first()
        .locator('.kl-toast-fuse')
        .evaluate((element) => getComputedStyle(element).transformOrigin.split(' ')[0]);
    expect(await origin()).toBe('0px');

    await openStory(page, 'right-to-left');
    await page.getByRole('button', { name: 'إظهار إشعار' }).click();
    const width = await toasts(page)
      .first()
      .locator('.kl-toast-fuse')
      .evaluate((element) => `${String(element.getBoundingClientRect().width)}px`);
    expect(await origin()).not.toBe('0px');
    expect(width).not.toBe('0px');
  });

  test('stays full width and still under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'keyboard-fixture');
    await button(page, 'Show neutral').click();
    await page.clock.runFor(3000);

    const drawn = await toasts(page)
      .first()
      .evaluate((item) => {
        const element = item.querySelector('.kl-toast-fuse') as HTMLElement;
        return {
          transform: getComputedStyle(element).transform,
          ratio: element.getBoundingClientRect().width / item.clientWidth,
        };
      });

    expect(drawn.transform).toBe('none');
    expect(drawn.ratio).toBeCloseTo(1, 1);
  });
});

test.describe('Toast with a modal dialog open', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  test('lives inside the dialog, so it is not inert and its buttons work', async ({ page }) => {
    await button(page, 'Show with action').click();
    await button(page, 'Open settings').click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });

    await expect(dialog.getByRole('region', { name: 'Notifications (F8)' })).toBeAttached();
    await expect(dialog.getByRole('status')).toBeAttached();
    await expect(dialog.getByRole('alert')).toBeAttached();

    await button(page, 'Save settings').click();
    await expect(toasts(page)).toHaveCount(2);
    await button(page, 'Dismiss: Settings saved').click();
    await settle(page);
    await expect(toasts(page)).toHaveCount(1);
    expect(await dialog.evaluate((element) => (element as HTMLDialogElement).open)).toBe(true);
  });

  test('Esc in a toast dismisses the toast, not the dialog', async ({ page }) => {
    await button(page, 'Open settings').click();
    await button(page, 'Save settings').click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });

    await button(page, 'Dismiss: Settings saved').focus();
    await page.keyboard.press('Escape');
    await settle(page);

    await expect(toasts(page)).toHaveCount(0);
    expect(await dialog.evaluate((element) => (element as HTMLDialogElement).open)).toBe(true);
  });

  test('moves back to the page when the dialog closes, keeping its toasts', async ({ page }) => {
    await button(page, 'Open settings').click();
    await button(page, 'Save settings').click();

    await button(page, 'Close settings').click();

    await expect(page.locator('body > .kl-toast-viewport')).toBeAttached();
    await expect(toasts(page)).toHaveCount(1);
    await expect(button(page, 'Dismiss: Settings saved')).toBeEnabled();
  });
});

test.describe('Toast display preferences', () => {
  test('stacks in the bottom inline-end corner, flipping in RTL', async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
    await button(page, 'Show neutral').click();
    const width = page.viewportSize()?.width ?? 0;
    const ltr = await toasts(page).first().boundingBox();
    expect(ltr && ltr.x + ltr.width).toBeGreaterThan(width - 40);

    await openStory(page, 'right-to-left');
    await page.getByRole('button', { name: 'إظهار إشعار' }).click();
    const rtl = await toasts(page).first().boundingBox();
    expect(rtl?.x).toBeLessThan(40);
  });

  test('names the tone in a slug line, with a distinct icon and an even border', async ({
    page,
  }) => {
    await openStory(page, 'tones');
    await button(page, 'Show success').click();
    await button(page, 'Show danger').click();

    const [success, danger] = await Promise.all(
      [0, 1].map((index) =>
        toasts(page)
          .nth(index)
          .evaluate((item) => {
            const style = getComputedStyle(item);
            const slug = item.querySelector('.kl-toast-slug') as HTMLElement;
            return {
              borders: [
                style.borderTopWidth,
                style.borderRightWidth,
                style.borderBottomWidth,
                style.borderLeftWidth,
              ],
              word: slug.innerText,
              wordColour: getComputedStyle(slug).color,
              path: item.querySelector('.kl-toast-icon path')?.getAttribute('d'),
            };
          }),
      ),
    );

    expect(success?.borders).toEqual(['1px', '1px', '1px', '1px']);
    expect(success?.word).toBe('SUCCESS');
    expect(danger?.word).toBe('ERROR');
    expect(success?.wordColour).not.toBe(danger?.wordColour);
    expect(success?.path).not.toBe(danger?.path);
  });

  test('drops its transitions when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'tones');
    await button(page, 'Show neutral').click();

    const durations = await toasts(page)
      .first()
      .evaluate((item) => getComputedStyle(item).transitionDuration);

    expect(durations.split(',').map((duration) => duration.trim())).toEqual(['0s', '0s']);
  });

  test('keeps the fuse visible in forced-colours mode', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Only Chromium can emulate forced-colors.');
    await page.emulateMedia({ forcedColors: 'active' });
    await openStory(page, 'tones');
    await button(page, 'Show warning').click();

    const [fuse, canvas] = await toasts(page)
      .first()
      .evaluate((item) => [
        getComputedStyle(item.querySelector('.kl-toast-fuse') as HTMLElement).backgroundColor,
        getComputedStyle(item).backgroundColor,
      ]);

    expect(fuse).not.toBe(canvas);
    expect(fuse).not.toBe('rgba(0, 0, 0, 0)');
  });
});
