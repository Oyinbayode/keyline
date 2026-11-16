import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

interface StoryIndex {
  entries: Record<string, { id: string; type: 'story' | 'docs' }>;
}

const docsIds = Object.values(
  (JSON.parse(readFileSync('storybook-static/index.json', 'utf8')) as StoryIndex).entries,
)
  .filter((entry) => entry.type === 'docs')
  .map((entry) => entry.id);

/*
 * Stories are tested one at a time; a docs page renders all of a component's
 * examples together, plus prop tables built from JSDoc. Markup in a JSDoc
 * comment is rendered as HTML there: a stray `<body>` once made React 19 adopt
 * the document's real <body> as its own element, and the next event sent
 * React's dispatch into an endless loop on the Toast page. React marks
 * elements it owns with a `__reactFiber` key, which <body> must never have.
 */
for (const id of docsIds) {
  test(`${id} renders, owns no document-level element, and stays responsive`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=docs`);
    await page.locator('.sbdocs-content').waitFor();
    await page.mouse.move(200, 200);
    await page.mouse.move(400, 300);

    const owned = await Promise.race([
      page.evaluate(
        () =>
          [document.documentElement, document.head, document.body].filter((element) =>
            Object.keys(element).some((key) => key.startsWith('__reactFiber')),
          ).length,
      ),
      new Promise<'hung'>((resolve) => {
        setTimeout(() => {
          resolve('hung');
        }, 10_000);
      }),
    ]);

    expect(owned).toBe(0);
  });
}
