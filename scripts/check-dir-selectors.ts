import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Fails when a build has rewritten the components' `:dir()` selectors.
 *
 * Lightning CSS lowers `:dir(rtl)` to a `:lang(ae, ar, …)` list for targets
 * older than Chrome 120. That list never matches a page that sets dir="rtl"
 * without an RTL lang, so components silently render left to right. This
 * happened to the Storybook build once; dist/ is checked as well so the
 * package can never ship it.
 *
 * Usage: node scripts/check-dir-selectors.ts <built dir> [more dirs…]
 */

function cssFiles(path: string): string[] {
  if (statSync(path).isFile()) return path.endsWith('.css') ? [path] : [];
  return readdirSync(path).flatMap((entry) => cssFiles(join(path, entry)));
}

function minify(selector: string): string {
  return selector.replace(/\s+/g, '');
}

// Every selector in the source that uses :dir(), e.g. ".kl-switch:dir(rtl)".
const sourceSelectors = cssFiles('src')
  .flatMap(
    (file) =>
      readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .match(/[^\s{},][^{},]*:dir\([a-z]+\)/g) ?? [],
  )
  .map(minify);

// The first entries of Lightning CSS's RTL language list.
const loweredDir = /:is\(:lang\(ae\),\s*:lang\(ar\)/;

const targets = process.argv.slice(2);
if (targets.length === 0) throw new Error('Pass the built directories to check.');

const failures: string[] = [];
for (const target of targets) {
  const css = cssFiles(target)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  const built = minify(css);
  if (loweredDir.test(css)) failures.push(`${target}: :dir() was lowered to a :lang() list`);
  for (const selector of sourceSelectors) {
    if (!built.includes(selector)) failures.push(`${target}: missing ${selector}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  `:dir() selectors intact in ${targets.join(', ')} (${String(sourceSelectors.length)} checked)`,
);
