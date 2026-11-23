import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/*
 * Right-to-left behaviour with the direction set the way most apps set it:
 * dir="rtl" alone, here through the Direction toolbar, with no RTL `lang`.
 * The lang="ar" stories elsewhere would also pass if a build lowered :dir()
 * to a :lang() list; these would not.
 */
async function openRtl(page: Page, id: string, theme: 'dark' | 'light') {
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=direction:rtl;theme:${theme}`);
  await page.locator('#storybook-root > *').first().waitFor();
}

async function expectDirOnly(locator: Locator) {
  const context = await locator.evaluate((element) => ({
    rtl: element.matches(':dir(rtl)'),
    lang: element.closest('[lang]')?.getAttribute('lang') ?? '',
  }));
  expect(context.rtl).toBe(true);
  expect(context.lang).not.toMatch(/^(ar|he|fa|ur|yi)/);
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`RTL by dir alone (${theme})`, () => {
    test('Switch slides its thumb towards the inline end', async ({ page }) => {
      await openRtl(page, 'components-switch--states', theme);
      const on = page.getByRole('switch', { name: 'On', exact: true });
      await expectDirOnly(on);

      const translateX = await on
        .locator('.kl-switch-thumb')
        .evaluate((thumb) => new DOMMatrixReadOnly(getComputedStyle(thumb).transform).m41);

      expect(translateX).toBeLessThan(0);
    });

    test('Tabs flip Left and Right, and keep the keyline under the selected tab', async ({
      page,
    }) => {
      await openRtl(page, 'components-tabs--horizontal', theme);
      const account = page.getByRole('tab', { name: 'Account' });
      await expectDirOnly(account);

      await account.focus();
      await page.keyboard.press('ArrowLeft');
      await expect(page.getByRole('tab', { name: 'Password' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await page.keyboard.press('ArrowRight');
      await expect(account).toHaveAttribute('aria-selected', 'true');

      const accountBox = await account.boundingBox();
      const passwordBox = await page.getByRole('tab', { name: 'Password' }).boundingBox();
      expect(accountBox?.x).toBeGreaterThan(passwordBox?.x ?? Infinity);
      expect(await account.evaluate((tab) => getComputedStyle(tab).borderBottomWidth)).toBe('2px');
    });

    test('vertical Tabs sit on the inline start with the keyline under the label', async ({
      page,
    }) => {
      await openRtl(page, 'components-tabs--vertical', theme);
      const list = page.getByRole('tablist');
      await expectDirOnly(list);

      const layout = await list.evaluate((element) => {
        const panel = document.querySelector('[role="tabpanel"]:not([hidden])') as HTMLElement;
        const tab = element.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
        const label = tab.querySelector('.kl-tab-label') as HTMLElement;
        return {
          listLeft: element.getBoundingClientRect().left,
          panelRight: panel.getBoundingClientRect().right,
          sides: [getComputedStyle(tab).borderLeftWidth, getComputedStyle(tab).borderRightWidth],
          underline: getComputedStyle(label).borderBottomWidth,
          tabEnd: element.getBoundingClientRect().right - tab.getBoundingClientRect().right,
        };
      });

      expect(layout.listLeft).toBeGreaterThan(layout.panelRight);
      expect(layout.sides).toEqual(['0px', '0px']);
      expect(layout.underline).toBe('2px');
      expect(layout.tabEnd).toBeCloseTo(0, 1);
    });

    test('Dialog lays out right to left and still returns focus on Esc', async ({ page }) => {
      await openRtl(page, 'components-dialog--basic', theme);
      await page.getByRole('button', { name: 'Edit profile' }).click();
      const dialog = page.getByRole('dialog', { name: 'Edit profile' });
      await expectDirOnly(dialog);

      const cancel = await dialog.getByRole('button', { name: 'Cancel' }).boundingBox();
      const save = await dialog.getByRole('button', { name: 'Save' }).boundingBox();
      expect(cancel?.x).toBeGreaterThan(save?.x ?? Infinity);

      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Edit profile' })).toBeFocused();
    });

    test('Menu opens at the inline start (the right) and keeps keys and shortcuts in place', async ({
      page,
    }) => {
      await openRtl(page, 'components-menu--basic', theme);
      const trigger = page.getByRole('button', { name: 'Edit' });
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      const menu = page.getByRole('menu', { name: 'Edit' });
      await expectDirOnly(menu);
      await expect(page.getByRole('menuitem', { name: 'Cut' })).toBeFocused();

      const triggerBox = await trigger.boundingBox();
      const menuBox = await menu.boundingBox();
      const cut = page.getByRole('menuitem', { name: 'Cut' });
      const label = await cut.locator('.kl-menu-item-label').boundingBox();
      const shortcut = await cut.locator('.kl-menu-shortcut').boundingBox();

      expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeCloseTo(
        (triggerBox?.x ?? 0) + (triggerBox?.width ?? 0),
        0,
      );
      expect(shortcut?.x).toBeLessThan(label?.x ?? 0);

      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('menuitem', { name: 'Copy' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    });

    test('Combobox list lines up with the input at the inline start (the right)', async ({
      page,
    }) => {
      await openRtl(page, 'components-combobox--basic', theme);
      const input = page.getByRole('combobox', { name: 'Fruit' });
      await expectDirOnly(input);
      await input.click();
      await page.keyboard.type('ap');
      await page.keyboard.press('ArrowDown');

      const inputBox = await input.boundingBox();
      const listBox = await page.locator('.kl-combobox-content').boundingBox();
      const trigger = await page.getByRole('button', { name: 'Show suggestions' }).boundingBox();

      expect((listBox?.x ?? 0) + (listBox?.width ?? 0)).toBeCloseTo(
        (inputBox?.x ?? 0) + (inputBox?.width ?? 0),
        0,
      );
      // The button sits at the inline end of the input, which is its left edge.
      expect(trigger?.x).toBeCloseTo(inputBox?.x ?? 0, 0);
      await expect(page.getByRole('option', { name: 'Apple' })).toHaveAttribute(
        'data-active',
        'keyboard',
      );
    });

    test('Toast stacks on the inline-end side and its fuse burns towards the inline start', async ({
      page,
    }) => {
      await openRtl(page, 'components-toast--keyboard-fixture', theme);
      await page.getByRole('button', { name: 'Show neutral', exact: true }).click();
      const toast = page.getByRole('region', { name: 'Notifications (F8)' }).getByRole('listitem');
      const fuse = toast.locator('.kl-toast-fuse');
      await expectDirOnly(fuse);

      const box = await toast.boundingBox();
      const origin = await fuse.evaluate((element) => getComputedStyle(element).transformOrigin);
      const width = await toast.evaluate((item) => item.getBoundingClientRect().width);

      expect(box?.x).toBeLessThan(40);
      expect(parseFloat(origin)).toBeCloseTo(width - 2, 0);
    });
  });
}
