import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

function openStory(page: Page, storyName: string) {
  return page.goto(`/iframe.html?id=components-dialog--${storyName}&viewMode=story`);
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const dialogNamed = (page: Page, name: string) => page.locator(`dialog[aria-label="${name}"]`);
const formDialog = (page: Page) => page.locator('dialog', { hasText: 'Form dialog' });

async function isOpen(dialog: ReturnType<typeof formDialog>) {
  return dialog.evaluate((element) => (element as HTMLDialogElement).open);
}

test.describe('Dialog focus', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  test('moves focus to the first tabbable element, skipping tabindex="-1"', async ({ page }) => {
    await button(page, 'Open form').click();

    await expect(page.getByRole('textbox', { name: 'Name' })).toBeFocused();
  });

  test('focuses the dialog itself when nothing inside is focusable', async ({ page }) => {
    await button(page, 'Open text-only').click();

    await expect(dialogNamed(page, 'Text-only alert')).toBeFocused();
  });

  test('never lets Tab or Shift+Tab reach the page behind', async ({ page }) => {
    await button(page, 'Open form').click();
    const dialog = formDialog(page);

    for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      const escaped = await dialog.evaluate((element) => {
        const active = document.activeElement;
        return active !== null && active !== document.body && !element.contains(active);
      });
      expect(escaped, `focus left the dialog after ${key}`).toBe(false);
    }
  });

  test('makes the page behind inert: it cannot be focused or clicked', async ({ page }) => {
    await button(page, 'Open form').click();

    const focusedBehind = await button(page, 'Before').evaluate((element) => {
      element.focus();
      return document.activeElement === element;
    });
    expect(focusedBehind).toBe(false);
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeFocused();
  });

  test('Esc closes it and returns focus to the trigger', async ({ page }) => {
    await button(page, 'Before').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeFocused();

    await page.keyboard.press('Escape');

    expect(await isOpen(formDialog(page))).toBe(false);
    await expect(button(page, 'Open form')).toBeFocused();
    await expect(button(page, 'Open form')).toHaveAttribute('aria-expanded', 'false');
  });

  test('Dialog.Close returns focus to the trigger', async ({ page }) => {
    await button(page, 'Open form').click();

    await button(page, 'Close form').click();

    await expect(button(page, 'Open form')).toBeFocused();
  });

  test('falls back quietly when the trigger was unmounted', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await button(page, 'Open, then lose the trigger').click();
    await expect(button(page, 'Open, then lose the trigger')).toHaveCount(0);

    await button(page, 'Close orphan').click();

    expect(await isOpen(dialogNamed(page, 'Orphaned dialog'))).toBe(false);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('nested dialogs: Esc closes only the top one, and focus unwinds', async ({ page }) => {
    await button(page, 'Open form').click();
    await button(page, 'Open nested').click();
    await expect(button(page, 'Close nested')).toBeFocused();

    await page.keyboard.press('Escape');
    expect(await isOpen(dialogNamed(page, 'Nested dialog'))).toBe(false);
    expect(await isOpen(formDialog(page))).toBe(true);
    await expect(button(page, 'Open nested')).toBeFocused();

    await page.keyboard.press('Escape');
    expect(await isOpen(formDialog(page))).toBe(false);
    await expect(button(page, 'Open form')).toBeFocused();
  });
});

test.describe('Dialog backdrop', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  test('a click on the backdrop closes it', async ({ page }) => {
    await button(page, 'Open form').click();

    await page.mouse.click(5, 5);

    expect(await isOpen(formDialog(page))).toBe(false);
    await expect(button(page, 'Open form')).toBeFocused();
  });

  test('dragging a text selection out onto the backdrop does not close it', async ({ page }) => {
    await button(page, 'Open form').click();
    const sentence = page.getByText('Select this sentence');
    const box = await sentence.boundingBox();
    if (!box) throw new Error('sentence not laid out');

    await page.mouse.move(box.x + 4, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(5, 5, { steps: 8 });
    await page.mouse.up();

    expect(await isOpen(formDialog(page))).toBe(true);
  });

  test('pressing on the backdrop and releasing inside does not close it', async ({ page }) => {
    await button(page, 'Open form').click();
    const box = await formDialog(page).boundingBox();
    if (!box) throw new Error('dialog not laid out');

    await page.mouse.move(5, 5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();

    expect(await isOpen(formDialog(page))).toBe(true);
  });

  test('an alertdialog ignores backdrop clicks', async ({ page }) => {
    await button(page, 'Open text-only').click();

    await page.mouse.click(5, 5);

    expect(await isOpen(dialogNamed(page, 'Text-only alert'))).toBe(true);
  });

  test('the backdrop is slate-1 at 70% from the tokens, with no blur', async ({ page }) => {
    await button(page, 'Open form').click();

    const backdrop = await formDialog(page).evaluate((element) => {
      const style = getComputedStyle(element, '::backdrop');
      return { colour: style.backgroundColor, filter: style.backdropFilter };
    });

    // Dark theme slate-1 is #04060a; color-mix keeps the channels and sets alpha.
    expect(backdrop.colour).toMatch(
      /^(color\(srgb 0\.0156\d* 0\.0235\d* 0\.0392\d* \/ 0\.7\)|rgba\(4, 6, 10, 0\.7\))$/,
    );
    expect(['none', '']).toContain(backdrop.filter);
  });
});

test.describe('Dialog state sync', () => {
  test('a controlled parent that refuses to close wins over Esc, twice', async ({ page }) => {
    await openStory(page, 'controlled');
    await button(page, 'Write a note').click();
    await page.getByRole('textbox', { name: 'Note' }).fill('Unsaved');
    const dialog = page.locator('dialog');

    await page.keyboard.press('Escape');
    expect(await isOpen(dialog)).toBe(true);
    await expect(page.getByText('You have unsaved changes')).toBeVisible();

    // Chromium skips the cancel event for a second Esc with no user activation in
    // between and closes the dialog directly; the close handler must re-open it.
    await page.keyboard.press('Escape');
    expect(await isOpen(dialog)).toBe(true);
    await expect(page.getByText('open: true')).toBeAttached();

    await button(page, 'Discard').click();
    expect(await isOpen(dialog)).toBe(false);
  });
});

test.describe('Dialog scroll lock and display preferences', () => {
  test('locks page scroll while open without shifting the layout', async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
    const layout = () =>
      page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        overflow: getComputedStyle(document.documentElement).overflow,
      }));
    const before = await layout();

    await button(page, 'Open form').click();
    const during = await layout();
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);

    expect(during.overflow).toBe('hidden');
    expect(during.width).toBe(before.width);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await button(page, 'Close form').click();
    expect(await layout()).toEqual(before);
  });

  test('animates on the duration tokens, and not at all under reduced motion', async ({ page }) => {
    const durations = () =>
      formDialog(page).evaluate((element) =>
        getComputedStyle(element)
          .transitionDuration.split(',')
          .map((duration) => duration.trim()),
      );

    await openStory(page, 'keyboard-fixture');
    expect(await durations()).toContain('0.2s');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'keyboard-fixture');
    expect(new Set(await durations())).toEqual(new Set(['0s']));
  });

  test('keeps a visible border in forced-colours mode', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Only Chromium can emulate forced-colors.');
    await page.emulateMedia({ forcedColors: 'active' });
    await openStory(page, 'keyboard-fixture');
    await button(page, 'Open form').click();

    const border = await formDialog(page).evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: style.borderTopWidth, style: style.borderTopStyle };
    });

    expect(border).toEqual({ width: '1px', style: 'solid' });
  });
});
