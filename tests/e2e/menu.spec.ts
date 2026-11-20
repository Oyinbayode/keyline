import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

function openStory(page: Page, storyName: string) {
  return page.goto(`/iframe.html?id=components-menu--${storyName}&viewMode=story`);
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const item = (page: Page, name: string) => page.getByRole('menuitem', { name, exact: true });
// Hidden too: a closed popover is display:none, and the tests check that it is closed.
const menuOf = (page: Page, name: string) =>
  page.getByRole('menu', { name, exact: true, includeHidden: true });

function isOpen(menu: Locator) {
  return menu.evaluate((element) => element.matches(':popover-open'));
}

async function focusTrigger(page: Page, name = 'Actions') {
  await button(page, name).focus();
}

/*
 * Pretends CSS anchor positioning is missing, so the measured fallback in
 * useAnchoredPopover runs; both browsers Playwright drives support it.
 */
async function withoutAnchorPositioning(page: Page) {
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = (property: string, value?: string): boolean => {
      if (`${property}${value ?? ''}`.includes('anchor-name')) return false;
      return value === undefined ? supports(property) : supports(property, value);
    };
  });
}

test.describe('Menu keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  for (const key of ['Enter', 'Space', 'ArrowDown']) {
    test(`${key} on the trigger opens the menu and focuses the first item`, async ({ page }) => {
      await focusTrigger(page);
      await page.keyboard.press(key);

      await expect(item(page, 'New file')).toBeFocused();
      expect(await isOpen(menuOf(page, 'Actions'))).toBe(true);
      await expect(button(page, 'Actions')).toHaveAttribute('aria-expanded', 'true');
    });
  }

  test('ArrowUp on the trigger opens the menu and focuses the last item', async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('ArrowUp');

    await expect(item(page, 'Delete')).toBeFocused();
  });

  test('arrows move through every item, disabled included, and wrap', async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('Enter');

    const visited: string[] = [];
    for (let step = 0; step < 5; step++) {
      await page.keyboard.press('ArrowDown');
      visited.push(await page.evaluate(() => document.activeElement?.textContent ?? ''));
    }
    expect(visited).toEqual(['New window', 'Save', 'Duplicate', 'Delete', 'New fileCtrl+N']);

    await page.keyboard.press('ArrowUp');
    await expect(item(page, 'Delete')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(item(page, 'New file')).toBeFocused();
    await page.keyboard.press('End');
    await expect(item(page, 'Delete')).toBeFocused();
  });

  test('typeahead: a letter, a repeated letter, and a phrase with a space', async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('Enter');

    await page.keyboard.press('d');
    await expect(item(page, 'Duplicate')).toBeFocused();
    await page.keyboard.press('d');
    await expect(item(page, 'Delete')).toBeFocused();
    await page.waitForTimeout(600);

    await page.keyboard.type('new w');
    await expect(item(page, 'New window')).toBeFocused();
    expect(await isOpen(menuOf(page, 'Actions'))).toBe(true);
  });

  test('Esc closes the menu and returns focus to the trigger', async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('Enter');

    await page.keyboard.press('Escape');

    expect(await isOpen(menuOf(page, 'Actions'))).toBe(false);
    await expect(button(page, 'Actions')).toBeFocused();
    await expect(button(page, 'Actions')).toHaveAttribute('aria-expanded', 'false');
  });

  test('Tab closes the menu and moves on to the next control after it', async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('Enter');

    await page.keyboard.press('Tab');

    expect(await isOpen(menuOf(page, 'Actions'))).toBe(false);
    await expect(button(page, 'Format')).toBeFocused();
  });

  test('Shift+Tab closes the menu and moves back to the control before the trigger', async ({
    page,
  }) => {
    await focusTrigger(page);
    await page.keyboard.press('Enter');

    await page.keyboard.press('Shift+Tab');

    expect(await isOpen(menuOf(page, 'Actions'))).toBe(false);
    await expect(button(page, 'Before')).toBeFocused();
  });

  for (const key of ['Enter', 'Space']) {
    test(`${key} on an item activates it, closes the menu and returns focus`, async ({ page }) => {
      await focusTrigger(page);
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');

      await page.keyboard.press(key);

      await expect(page.getByText('Last action: New window')).toBeVisible();
      expect(await isOpen(menuOf(page, 'Actions'))).toBe(false);
      await expect(button(page, 'Actions')).toBeFocused();
      // The key's keyup lands on the trigger; it must not open the menu again.
      await page.waitForTimeout(100);
      expect(await isOpen(menuOf(page, 'Actions'))).toBe(false);
    });
  }

  test('a disabled item is focusable but does nothing', async ({ page }) => {
    await focusTrigger(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('s');
    await expect(item(page, 'Save')).toBeFocused();

    await page.keyboard.press('Enter');

    expect(await isOpen(menuOf(page, 'Actions'))).toBe(true);
    await expect(page.getByText('Last action: none')).toBeVisible();
  });

  test('checkbox and radio items toggle and keep the menu open', async ({ page }) => {
    await focusTrigger(page, 'Format');
    await page.keyboard.press('Enter');

    await page.keyboard.press(' ');
    await expect(page.getByRole('menuitemcheckbox', { name: 'Wrap lines' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');

    await expect(page.getByText('wrap: true · size: large')).toBeVisible();
    expect(await isOpen(menuOf(page, 'Format'))).toBe(true);
    await expect(page.getByRole('menuitemradio', { name: 'Large' })).toBeFocused();
  });
});

test.describe('Menu pointer', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'keyboard-fixture');
  });

  test('moving over items focuses them; a click activates', async ({ page }) => {
    await button(page, 'Actions').click();

    await item(page, 'Duplicate').hover();
    await expect(item(page, 'Duplicate')).toBeFocused();
    await item(page, 'Save').hover();
    await expect(item(page, 'Save')).toBeFocused();

    await item(page, 'Delete').click();
    await expect(page.getByText('Last action: Delete')).toBeVisible();
    expect(await isOpen(menuOf(page, 'Actions'))).toBe(false);
  });

  test('a click outside closes it, and React state follows the browser', async ({ page }) => {
    await button(page, 'Actions').click();

    await page.mouse.click(600, 400);

    expect(await isOpen(menuOf(page, 'Actions'))).toBe(false);
    await expect(button(page, 'Actions')).toHaveAttribute('aria-expanded', 'false');
    // Opens again on the next click: the state did not get stuck at "open".
    await button(page, 'Actions').click();
    expect(await isOpen(menuOf(page, 'Actions'))).toBe(true);
  });

  test('a slow click on the trigger of an open menu closes it, and does not reopen it', async ({
    page,
  }) => {
    await button(page, 'Actions').click();
    const box = await button(page, 'Actions').boundingBox();
    if (!box) throw new Error('trigger not laid out');

    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(100);

    expect(await isOpen(menuOf(page, 'Actions'))).toBe(false);
    await expect(button(page, 'Actions')).toHaveAttribute('aria-expanded', 'false');
  });

  test('opening one menu closes the other', async ({ page }) => {
    // Format first: the Actions menu would cover the Format trigger below it.
    await button(page, 'Format').click();

    await button(page, 'Actions').click();

    expect(await isOpen(menuOf(page, 'Format'))).toBe(false);
    expect(await isOpen(menuOf(page, 'Actions'))).toBe(true);
    await expect(button(page, 'Format')).toHaveAttribute('aria-expanded', 'false');
  });
});

for (const path of ['anchor positioning', 'measured fallback'] as const) {
  test.describe(`Menu placement (${path})`, () => {
    test.beforeEach(async ({ page }) => {
      if (path === 'measured fallback') await withoutAnchorPositioning(page);
      await openStory(page, 'placement');
    });

    test('opens below the trigger, lined up with its start edge', async ({ page }) => {
      await button(page, 'Bottom, start').click();
      const trigger = await button(page, 'Bottom, start').boundingBox();
      const menu = await menuOf(page, 'Bottom, start').boundingBox();

      expect(menu?.y).toBeGreaterThan((trigger?.y ?? 0) + (trigger?.height ?? 0));
      expect(menu?.x).toBeCloseTo(trigger?.x ?? 0, 0);
    });

    test('side="top" align="end" opens above, lined up with the end edge', async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 600 });
      // Room above the trigger, so the preferred side is used.
      await button(page, 'Top, end').evaluate((element) => {
        Object.assign(element.style, { position: 'fixed', top: '300px', left: '300px' });
      });
      await button(page, 'Top, end').click();
      const trigger = await button(page, 'Top, end').boundingBox();
      const menu = await menuOf(page, 'Top, end').boundingBox();

      expect((menu?.y ?? 0) + (menu?.height ?? 0)).toBeLessThan(trigger?.y ?? 0);
      expect((menu?.x ?? 0) + (menu?.width ?? 0)).toBeCloseTo(
        (trigger?.x ?? 0) + (trigger?.width ?? 0),
        0,
      );
    });

    test('flips above and to the end edge near the bottom-right corner', async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 600 });
      await button(page, 'Bottom, start').evaluate((element) => {
        Object.assign(element.style, { position: 'fixed', bottom: '8px', right: '8px' });
      });
      await button(page, 'Bottom, start').click();
      const trigger = await button(page, 'Bottom, start').boundingBox();
      const menu = await menuOf(page, 'Bottom, start').boundingBox();

      expect((menu?.y ?? 0) + (menu?.height ?? 0)).toBeLessThanOrEqual(trigger?.y ?? 0);
      expect((menu?.x ?? 0) + (menu?.width ?? 0)).toBeCloseTo(
        (trigger?.x ?? 0) + (trigger?.width ?? 0),
        0,
      );
      expect(menu?.x).toBeGreaterThanOrEqual(0);
    });

    test('follows the trigger when the page scrolls', async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 400 });
      await page.locator('#storybook-root').evaluate((root) => {
        root.style.paddingBlockEnd = '2000px';
      });
      await button(page, 'Bottom, start').click();

      await page.mouse.wheel(0, 50);
      await page.waitForTimeout(200);
      const trigger = await button(page, 'Bottom, start').boundingBox();
      const menu = await menuOf(page, 'Bottom, start').boundingBox();

      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      expect(menu?.y).toBeCloseTo((trigger?.y ?? 0) + (trigger?.height ?? 0) + 4, 0);
    });
  });
}

test('reports which positioning path each browser takes', async ({ page, browserName }) => {
  await openStory(page, 'placement');
  const anchored = await page.evaluate(() => CSS.supports('anchor-name: --kl'));
  test.info().annotations.push({
    type: 'positioning',
    description: `${browserName}: ${anchored ? 'CSS anchor positioning' : 'measured fallback'}`,
  });
  await button(page, 'Bottom, start').click();
  const style = await menuOf(page, 'Bottom, start').evaluate((element) => ({
    anchor: element.style.getPropertyValue('position-anchor'),
    top: element.style.top,
  }));

  expect(anchored).toBe(true);
  expect(style.anchor).toMatch(/^--kl-anchor-/);
  // Placed by CSS: no measured pixel offsets written inline.
  expect(style.top).toBe('auto');
});

test.describe('Menu inside a Keyline Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'inside-dialog');
    await button(page, 'Open document').click();
  });

  test('opens above the modal dialog and is not inert', async ({ page }) => {
    await button(page, 'Document actions').click();
    const rename = item(page, 'Rename');
    await expect(rename).toBeFocused();

    const box = await rename.boundingBox();
    if (!box) throw new Error('item not laid out');
    const hit = await page.evaluate(
      ([x, y]) =>
        document.elementFromPoint(x ?? 0, y ?? 0)?.closest('[role="menuitem"]')?.textContent,
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(hit).toBe('Rename');

    await rename.click();
    await expect(page.getByText('Last action: Rename')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Quarterly report' })).toBeVisible();
  });

  test('Esc closes only the menu; a second Esc closes the dialog', async ({ page }) => {
    await button(page, 'Document actions').click();

    await page.keyboard.press('Escape');
    expect(await isOpen(menuOf(page, 'Document actions'))).toBe(false);
    await expect(page.getByRole('dialog', { name: 'Quarterly report' })).toBeVisible();
    await expect(button(page, 'Document actions')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Quarterly report' })).toBeHidden();
    await expect(button(page, 'Open document')).toBeFocused();
  });
});

test.describe('Menu display preferences', () => {
  test('fades on the fast duration token, and not at all under reduced motion', async ({
    page,
  }) => {
    const durations = () =>
      menuOf(page, 'Edit').evaluate((element) =>
        getComputedStyle(element)
          .transitionDuration.split(',')
          .map((duration) => duration.trim()),
      );

    await openStory(page, 'basic');
    await button(page, 'Edit').click();
    expect(new Set(await durations())).toEqual(new Set(['0.12s']));

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'basic');
    await button(page, 'Edit').click();
    expect(new Set(await durations())).toEqual(new Set(['0s']));
  });

  test('the active item is a slate-4 fill with slate-12 text, and no side stripe', async ({
    page,
  }) => {
    await page.goto('/iframe.html?id=components-menu--basic&viewMode=story&globals=theme:light');
    await button(page, 'Edit').click();

    const active = await item(page, 'Cut').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        colour: style.color,
        sides: [style.borderLeftWidth, style.borderRightWidth, style.boxShadow],
      };
    });

    // Light theme slate-4 #e6ebf3 and slate-12 #0a0f18.
    expect(active).toEqual({
      background: 'rgb(230, 235, 243)',
      colour: 'rgb(10, 15, 24)',
      sides: ['0px', '0px', 'none'],
    });
  });

  test('forced colours: Highlight on the active item, a visible border and separator', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Only Chromium can emulate forced-colors.');
    await page.emulateMedia({ forcedColors: 'active' });
    await openStory(page, 'keyboard-fixture');
    await button(page, 'Actions').click();

    const styles = await menuOf(page, 'Actions').evaluate((menu) => {
      const probe = document.createElement('div');
      probe.style.cssText = 'background: Highlight; color: HighlightText';
      document.body.append(probe);
      const system = getComputedStyle(probe);
      const active = getComputedStyle(document.activeElement as Element);
      const separator = getComputedStyle(menu.querySelector('[role="separator"]') as Element);
      const result = {
        activeMatches:
          active.backgroundColor === system.backgroundColor && active.color === system.color,
        border: getComputedStyle(menu).borderTopWidth,
        separator: separator.borderTopWidth,
      };
      probe.remove();
      return result;
    });

    expect(styles).toEqual({ activeMatches: true, border: '1px', separator: '1px' });
  });
});
