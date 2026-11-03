import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

interface StoryIndex {
  entries: Record<string, { id: string; type: 'story' | 'docs' }>;
}

function readStoryIds(): string[] {
  const storyIndex = JSON.parse(readFileSync('storybook-static/index.json', 'utf8')) as StoryIndex;
  return Object.values(storyIndex.entries)
    .filter((entry) => entry.type === 'story')
    .map((entry) => entry.id);
}

/*
 * Storybook's a11y addon runs axe in the same page as soon as a story renders,
 * and axe refuses to start while another run is in progress. Wait it out.
 */
async function analyzeStory(page: Page) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await new AxeBuilder({ page }).include('#storybook-root').analyze();
    } catch (error) {
      const isBusy = error instanceof Error && error.message.includes('Axe is already running');
      if (!isBusy || attempt === 10) throw error;
      await page.waitForTimeout(250);
    }
  }
}

for (const theme of ['dark', 'light']) {
  for (const storyId of readStoryIds()) {
    test(`${storyId} (${theme}) has no axe violations`, async ({ page }) => {
      await page.goto(`/iframe.html?id=${storyId}&viewMode=story&globals=theme:${theme}`);
      await page.locator('#storybook-root > *').first().waitFor();

      const results = await analyzeStory(page);

      expect(results.violations).toEqual([]);
    });
  }
}
