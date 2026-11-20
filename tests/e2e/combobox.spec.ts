import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

function openStory(page: Page, storyName: string) {
  return page.goto(`/iframe.html?id=components-combobox--${storyName}&viewMode=story`);
}

const combobox = (page: Page) => page.getByRole('combobox').first();
const option = (page: Page, name: string) => page.getByRole('option', { name, exact: true });
// By id: the list is display:none when closed, and loses the listbox role when empty.
const list = (page: Page) => page.locator('.kl-combobox-content').first();

function isOpen(locator: Locator) {
  return locator.evaluate((element) => element.matches(':popover-open'));
}

async function activeOption(page: Page) {
  return combobox(page).evaluate((input) => {
    const id = input.getAttribute('aria-activedescendant');
    return id ? (document.getElementById(id)?.dataset.text ?? null) : null;
  });
}

async function withoutAnchorPositioning(page: Page) {
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = (property: string, value?: string): boolean => {
      if (`${property}${value ?? ''}`.includes('anchor-name')) return false;
      return value === undefined ? supports(property) : supports(property, value);
    };
  });
}

test.describe('Combobox keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
    await page.getByRole('button', { name: 'Before' }).focus();
    await page.keyboard.press('Tab');
  });

  test('Tab reaches the input; typing opens the list and filters it, accents ignored', async ({
    page,
  }) => {
    await expect(combobox(page)).toBeFocused();

    await page.keyboard.type('cura');

    expect(await isOpen(list(page))).toBe(true);
    await expect(page.getByRole('option')).toHaveText(['Curaçao']);
    await expect(option(page, 'Curaçao').locator('mark')).toHaveText('Cura');
    expect(await activeOption(page)).toBeNull();
  });

  test('Enter with no active option chooses nothing', async ({ page }) => {
    await page.keyboard.type('ga');
    await page.keyboard.press('Enter');

    await expect(page.getByText('value: ""')).toBeVisible();
    await expect(combobox(page)).toHaveValue('ga');
  });

  test('Down and Up move the active option, keep DOM focus in the input, and wrap', async ({
    page,
  }) => {
    await page.keyboard.press('ArrowDown');
    expect(await activeOption(page)).toBe('Åland Islands');
    await page.keyboard.press('ArrowUp');
    expect(await activeOption(page)).toBe('Togo');
    await page.keyboard.press('ArrowDown');
    expect(await activeOption(page)).toBe('Åland Islands');

    await expect(combobox(page)).toBeFocused();
    await expect(option(page, 'Åland Islands')).toHaveAttribute('data-active', '');
  });

  test('the active option is scrolled into view', async ({ page }) => {
    await page.keyboard.press('ArrowUp');

    const visible = await option(page, 'Togo').evaluate((element) => {
      const box = element.getBoundingClientRect();
      const viewport = (element.parentElement as HTMLElement).getBoundingClientRect();
      return box.top >= viewport.top && box.bottom <= viewport.bottom;
    });
    expect(visible).toBe(true);
  });

  test('Enter chooses the active option, fills the input and closes', async ({ page }) => {
    await page.keyboard.type('gh');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(combobox(page)).toHaveValue('Ghana');
    await expect(page.getByText('value: "ghana"')).toBeVisible();
    expect(await isOpen(list(page))).toBe(false);
    await expect(combobox(page)).toBeFocused();
  });

  test('Alt+Down opens without moving; Alt+Up closes', async ({ page }) => {
    await page.keyboard.press('Alt+ArrowDown');
    expect(await isOpen(list(page))).toBe(true);
    expect(await activeOption(page)).toBeNull();

    await page.keyboard.press('Alt+ArrowUp');
    expect(await isOpen(list(page))).toBe(false);
  });

  test('Esc closes the list, then clears the input', async ({ page }) => {
    await page.keyboard.type('ken');
    await page.keyboard.press('Escape');
    expect(await isOpen(list(page))).toBe(false);
    await expect(combobox(page)).toHaveValue('ken');

    await page.keyboard.press('Escape');
    await expect(combobox(page)).toHaveValue('');
  });

  test('Home and End move the caret in the input', async ({ page }) => {
    await page.keyboard.type('nigeria');
    await page.keyboard.press('ArrowDown');

    await page.keyboard.press('Home');
    expect(await combobox(page).evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(
      0,
    );
    expect(await activeOption(page)).toBeNull();
    await page.keyboard.press('End');
    expect(await combobox(page).evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(
      7,
    );
  });

  test('Tab closes the list without choosing and moves past the button', async ({ page }) => {
    await page.keyboard.type('ken');
    await page.keyboard.press('ArrowDown');

    await page.keyboard.press('Tab');

    expect(await isOpen(list(page))).toBe(false);
    await expect(page.getByRole('button', { name: 'Submit' })).toBeFocused();
    await expect(page.getByText('value: ""')).toBeVisible();
  });

  test('leaving with text that matches nothing restores the chosen option', async ({ page }) => {
    await page.keyboard.type('tog');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.type('xx');

    await page.keyboard.press('Tab');

    await expect(combobox(page)).toHaveValue('Togo');
  });

  test('a disabled option is reached and announced, but cannot be chosen', async ({ page }) => {
    await page.keyboard.type('egy');
    await page.keyboard.press('ArrowDown');
    await expect(option(page, 'Egypt')).toHaveAttribute('aria-disabled', 'true');

    await page.keyboard.press('Enter');

    await expect(page.getByText('value: ""')).toBeVisible();
  });

  test('ignores Enter and arrows while an input method is composing', async ({ page }) => {
    await page.keyboard.type('se');
    await page.keyboard.press('ArrowDown');

    await combobox(page).evaluate((input) => {
      for (const key of ['ArrowDown', 'Enter']) {
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key, isComposing: true, bubbles: true, cancelable: true }),
        );
      }
    });

    expect(await activeOption(page)).toBe('Senegal');
    await expect(page.getByText('value: ""')).toBeVisible();
  });

  test('announces the result count once, after typing settles', async ({ page }) => {
    const status = page.getByRole('status');
    // Every text the live region holds while a word is typed key by key.
    await status.evaluate((region) => {
      const seen: string[] = [];
      Object.assign(window, { announcements: seen });
      new MutationObserver(() => {
        if (region.textContent) seen.push(region.textContent);
      }).observe(region, { childList: true, characterData: true, subtree: true });
    });

    await page.keyboard.type('ang', { delay: 100 });
    await expect(status).toHaveText('1 result');
    await page.waitForTimeout(800);

    expect(
      await page.evaluate(() => (window as unknown as { announcements: string[] }).announcements),
    ).toEqual(['1 result']);

    await page.keyboard.type('zz');
    await expect(status).toHaveText('No results');
    await expect(page.getByText('No country matches.')).toBeVisible();
  });

  test('submits the chosen value with the form', async ({ page }) => {
    await page.keyboard.type('ben');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('submitted: {"country":"benin"}')).toBeVisible();
  });
});

test.describe('Combobox pointer', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  test('pressing an option does not blur the input; releasing chooses it', async ({ page }) => {
    await combobox(page).click();
    await page.keyboard.type('ke');
    const box = await option(page, 'Kenya').boundingBox();
    if (!box) throw new Error('option not laid out');

    await page.mouse.move(box.x + 8, box.y + box.height / 2);
    await expect(option(page, 'Kenya')).toHaveAttribute('data-active', '');
    await page.mouse.down();
    await expect(combobox(page)).toBeFocused();
    expect(await isOpen(list(page))).toBe(true);
    await page.mouse.up();

    await expect(combobox(page)).toHaveValue('Kenya');
    await expect(combobox(page)).toBeFocused();
  });

  test('the button opens and closes the list with focus left in the input', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Show suggestions' });

    await button.click();
    expect(await isOpen(list(page))).toBe(true);
    await expect(combobox(page)).toBeFocused();

    await button.click();
    expect(await isOpen(list(page))).toBe(false);
  });

  test('a click elsewhere closes the list', async ({ page }) => {
    await combobox(page).click();
    await page.keyboard.type('a');

    await page.mouse.click(600, 400);

    expect(await isOpen(list(page))).toBe(false);
    await expect(combobox(page)).toHaveAttribute('aria-expanded', 'false');
  });
});

test('a group whose options are all filtered out disappears with its label', async ({ page }) => {
  await openStory(page, 'groups');
  await combobox(page).click();

  await page.keyboard.type('lis');

  await expect(page.getByText('Europe', { exact: true })).toBeVisible();
  await expect(page.getByText('Africa', { exact: true })).toBeHidden();
});

for (const path of ['anchor positioning', 'measured fallback'] as const) {
  test.describe(`Combobox placement (${path})`, () => {
    test.beforeEach(async ({ page }) => {
      if (path === 'measured fallback') await withoutAnchorPositioning(page);
      await openStory(page, 'basic');
    });

    test('opens below the input, at least as wide as it', async ({ page }) => {
      await combobox(page).click();
      await page.keyboard.press('ArrowDown');
      const field = await combobox(page).boundingBox();
      const box = await list(page).boundingBox();

      expect(box?.y).toBeGreaterThan((field?.y ?? 0) + (field?.height ?? 0));
      expect(box?.x).toBeCloseTo(field?.x ?? 0, 0);
      expect(box?.width).toBeGreaterThanOrEqual((field?.width ?? 0) - 0.5);
    });

    test('flips above the input near the bottom of the viewport', async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 500 });
      await page.locator('.kl-combobox').evaluate((root) => {
        Object.assign((root as HTMLElement).style, { position: 'fixed', bottom: '8px' });
      });
      await combobox(page).click();
      await page.keyboard.press('ArrowDown');
      const field = await combobox(page).boundingBox();
      const box = await list(page).boundingBox();

      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(field?.y ?? 0);
    });
  });
}

test.describe('Combobox inside a Keyline Dialog', () => {
  test('opens above the dialog, and Esc unwinds list, text, then dialog', async ({ page }) => {
    await openStory(page, 'inside-dialog');
    await page.getByRole('button', { name: 'Add to basket' }).click();
    await combobox(page).click();
    await page.keyboard.type('fig');
    await page.keyboard.press('ArrowDown');

    const box = await option(page, 'Fig').boundingBox();
    if (!box) throw new Error('option not laid out');
    const hit = await page.evaluate(
      ([x, y]) =>
        document.elementFromPoint(x ?? 0, y ?? 0)?.closest('[role="option"]')?.textContent,
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(hit).toBe('Fig');

    const dialog = page.getByRole('dialog', { name: 'Add to basket' });
    await page.keyboard.press('Escape');
    expect(await isOpen(list(page))).toBe(false);
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(combobox(page)).toHaveValue('');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('chooses an option by click inside the dialog', async ({ page }) => {
    await openStory(page, 'inside-dialog');
    await page.getByRole('button', { name: 'Add to basket' }).click();
    await page.getByRole('button', { name: 'Show suggestions' }).click();

    await option(page, 'Guava').click();

    await expect(page.getByText('value: "guava"')).toBeVisible();
  });
});

test.describe('Combobox display preferences', () => {
  test('fades on the fast duration token, and not at all under reduced motion', async ({
    page,
  }) => {
    const durations = () =>
      list(page).evaluate((element) =>
        getComputedStyle(element)
          .transitionDuration.split(',')
          .map((duration) => duration.trim()),
      );

    await openStory(page, 'basic');
    expect(new Set(await durations())).toEqual(new Set(['0.12s']));

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'basic');
    expect(new Set(await durations())).toEqual(new Set(['0s']));
  });

  test('the match is a 2px blue-9 underline, not bold and not a fill', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-combobox--basic&viewMode=story&globals=theme:light',
    );
    await combobox(page).click();
    await page.keyboard.type('ban');

    const mark = await option(page, 'Banana')
      .locator('mark')
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          line: style.textDecorationLine,
          thickness: style.textDecorationThickness,
          colour: style.textDecorationColor,
          background: style.backgroundColor,
          weight: style.fontWeight,
        };
      });

    expect(mark).toEqual({
      line: 'underline',
      thickness: '2px',
      colour: 'rgb(31, 86, 224)',
      background: 'rgba(0, 0, 0, 0)',
      weight: '400',
    });
  });

  test('forced colours: Highlight on the active option, a border, and the underline kept', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Only Chromium can emulate forced-colors.');
    await page.emulateMedia({ forcedColors: 'active' });
    await openStory(page, 'basic');
    await combobox(page).click();
    await page.keyboard.type('ap');
    await page.keyboard.press('ArrowDown');

    const styles = await list(page).evaluate((element) => {
      const probe = document.createElement('div');
      probe.style.cssText = 'background: Highlight; color: HighlightText';
      document.body.append(probe);
      const system = getComputedStyle(probe);
      const active = getComputedStyle(element.querySelector('[data-active]') as Element);
      const mark = getComputedStyle(element.querySelector('mark') as Element);
      const result = {
        activeMatches:
          active.backgroundColor === system.backgroundColor && active.color === system.color,
        border: getComputedStyle(element).borderTopWidth,
        underline: mark.textDecorationLine,
      };
      probe.remove();
      return result;
    });

    expect(styles).toEqual({ activeMatches: true, border: '1px', underline: 'underline' });
  });
});
