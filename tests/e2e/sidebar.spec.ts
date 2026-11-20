import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/*
 * The docs sidebar is Storybook's markup, styled from .storybook/manager-head.html.
 * The current page is marked with crop marks, never a bar on one side.
 */
const current = (page: Page) => page.locator('.sidebar-item[data-selected="true"]');

async function openManager(page: Page, path: string, theme: 'dark' | 'light') {
  await page.goto(`/?path=${path}&globals=theme:${theme}`);
  await current(page).waitFor();
  // manager.ts applies the theme once Storybook reports its globals.
  await expect(page.locator('html')).toHaveAttribute('data-kl-theme', theme);
}

function marks(page: Page, itemId?: string) {
  const row = itemId ? page.locator(`.sidebar-item[data-item-id="${itemId}"]`) : current(page);
  return row.evaluate((element) => {
    const style = getComputedStyle(element);
    const before = getComputedStyle(element, '::before');
    return {
      sides: [style.borderLeftWidth, style.borderRightWidth, style.boxShadow],
      background: style.backgroundColor,
      gradients: before.backgroundImage.match(/linear-gradient/g)?.length ?? 0,
      colours: [...new Set(before.backgroundImage.match(/rgba?\([^)]*\)/g))],
    };
  });
}

for (const [theme, accent, mark] of [
  ['dark', 'rgb(91, 141, 255)', 'rgb(80, 96, 123)'],
  ['light', 'rgb(31, 86, 224)', 'rgb(126, 143, 171)'],
] as const) {
  for (const path of ['/docs/components-tabs--docs', '/story/components-tabs--vertical']) {
    test(`${theme}: ${path} is marked with crop marks, not a side bar`, async ({ page }) => {
      await openManager(page, path, theme);

      const selected = await marks(page);

      expect(selected.sides).toEqual(['0px', '0px', 'none']);
      expect(selected.background).toBe('rgba(0, 0, 0, 0)');
      expect(selected.gradients).toBe(8);
      expect(selected.colours).toEqual([accent]);
    });
  }

  test(`${theme}: hovering another row shows the same marks in slate-8`, async ({ page }) => {
    await openManager(page, '/docs/components-tabs--docs', theme);
    await page.locator('.sidebar-item[data-item-id="components-tabs--horizontal"]').hover();

    const hovered = await marks(page, 'components-tabs--horizontal');

    expect(hovered.colours).toEqual([mark]);
  });
}

test('keyboard focus in the sidebar shows the double focus ring', async ({ page }) => {
  await openManager(page, '/docs/components-tabs--docs', 'dark');
  await page.getByRole('link', { name: 'Horizontal', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');

  const ring = await page.evaluate(
    () => getComputedStyle(document.activeElement as Element).boxShadow,
  );

  expect(ring).toContain('0px 0px 0px 4px');
});
