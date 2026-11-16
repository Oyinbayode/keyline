# Keyline

[![npm](https://img.shields.io/npm/v/@oyinbayode/keyline?style=flat-square&label=npm&color=1f56e0)](https://www.npmjs.com/package/@oyinbayode/keyline)
[![CI](https://img.shields.io/github/actions/workflow/status/Oyinbayode/keyline/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Oyinbayode/keyline/actions/workflows/ci.yml)

Accessible React components with a keyboard and screen-reader contract you can read, and tests that prove it.

[Docs and live examples](https://oyinbayode.github.io/keyline/) · [npm](https://www.npmjs.com/package/@oyinbayode/keyline) · MIT

## Problem

Most component libraries say they are "accessible" and stop there. You cannot tell which keys work, what a screen reader announces, or whether anyone tried one. The failures that matter (a control you cannot reach with <kbd>Tab</kbd>, focus escaping a dialog, a state shown only in colour) are invisible with a mouse and a typical monitor, so they ship.

## Solution

Keyline is a small React 19 + TypeScript library where each component:

- **follows a named WAI-ARIA APG pattern** and links to it;
- **documents its keyboard contract** in a table;
- **says what was tested and how**: unit tests, axe-core (0 violations in every state), Playwright in Chromium and Firefox, the Guidepup virtual screen reader, and manual runs with real screen readers, each marked pass or pending;
- **uses native elements first**, so the browser provides focus, key handling, and form behaviour;
- **is styled by design tokens**: light and dark themes, reduced motion, forced colours, and right-to-left handled in CSS custom properties you can override.

Available now: **Switch**, **Tabs**, **Dialog**, **Toast**. Next: Menu, Combobox, Date picker.

| Component | APG pattern                                                              | Import                       | Docs                                                                               |
| --------- | ------------------------------------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------- |
| Switch    | [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)               | `@oyinbayode/keyline/switch` | [Switch](https://oyinbayode.github.io/keyline/?path=/docs/components-switch--docs) |
| Tabs      | [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)                   | `@oyinbayode/keyline/tabs`   | [Tabs](https://oyinbayode.github.io/keyline/?path=/docs/components-tabs--docs)     |
| Dialog    | [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | `@oyinbayode/keyline/dialog` | [Dialog](https://oyinbayode.github.io/keyline/?path=/docs/components-dialog--docs) |
| Toast     | [Alert](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) + WCAG 4.1.3    | `@oyinbayode/keyline/toast`  | [Toast](https://oyinbayode.github.io/keyline/?path=/docs/components-toast--docs)   |

## Install

```sh
pnpm add @oyinbayode/keyline
# or: npm install @oyinbayode/keyline
```

React 19 is a peer dependency.

## Usage

```tsx
import { Switch } from '@oyinbayode/keyline';
import '@oyinbayode/keyline/styles.css';

export function WifiSetting() {
  return (
    <label>
      <Switch defaultChecked onCheckedChange={(isOn) => console.log(isOn)} />
      Wi-Fi
    </label>
  );
}
```

Controlled:

```tsx
const [isOn, setIsOn] = useState(false);
<Switch aria-label="Wi-Fi" checked={isOn} onCheckedChange={setIsOn} />;
```

Every component accepts `className`, `style`, and `ref`, passes other props to its root element, and exposes its state as `data-state` for custom styling. Per-component entry points (`@oyinbayode/keyline/switch`, `@oyinbayode/keyline/tabs`, `@oyinbayode/keyline/dialog`, `@oyinbayode/keyline/toast`, `@oyinbayode/keyline/primitives`) and ESM tree-shaking keep imports small.

If you lint with `eslint-plugin-jsx-a11y`, tell `label-has-associated-control` that `Switch` is a control:

```js
'jsx-a11y/label-has-associated-control': ['error', { controlComponents: ['Switch'], assert: 'either' }],
```

## Theming

The stylesheet is driven entirely by CSS custom properties. It follows the OS colour scheme by default; force a theme on any subtree with `data-theme`:

```html
<div data-theme="light">…</div>
<div data-theme="dark">…</div>
```

Colours come from two 12-step scales, `--kl-slate-1` … `--kl-slate-12` and `--kl-blue-1` … `--kl-blue-12`, each declared once with `light-dark()`. The step says what a colour is for: 1–2 backgrounds, 3–5 component fills (rest, hover, active), 6–8 borders (8 is the strongest, 3:1 on the background), 9–10 solid fills (9 is the accent, 10 its hover), 11–12 text (4.5:1 or more on steps 1–2). `--kl-success`, `--kl-warning`, and `--kl-danger` cover status. The semantic aliases from 0.0.x (`--kl-color-bg`, `--kl-color-text`, `--kl-color-accent`, …) still work and now point at scale steps.

Rebrand by overriding the accent steps, or an alias:

```css
:root {
  --kl-blue-9: light-dark(#0f7b5f, #3ccf9f);
  --kl-blue-10: light-dark(#0c6a52, #5bd9b0);
}
```

There are also tokens for space (`--kl-space-1` … `--kl-space-8`), radius, depth (`--kl-shadow-raised`, `--kl-shadow-floating`), motion (`--kl-duration-*`, which drop to `0ms` under reduced motion, `--kl-ease`, `--kl-ease-spring`), and the focus ring (`--kl-focus-ring`).

Keyline never ships or sets a font: `--kl-font-family` is `inherit`, so components use your page's font. `@oyinbayode/keyline/tokens.css` ships the tokens alone if you want to style components yourself. All tokens are shown live on the [Tokens page](https://oyinbayode.github.io/keyline/?path=/docs/tokens--docs).

## Accessibility statement

Keyline targets WCAG 2.2 AA and the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/). This is what is actually tested for each component, as of the version in `package.json`:

| Check                                                      | Tooling                                           | Switch  | Tabs    | Dialog  | Toast   |
| ---------------------------------------------------------- | ------------------------------------------------- | ------- | ------- | ------- | ------- |
| Behaviour (controlled, uncontrolled, state, refs)          | Vitest + Testing Library, jsdom                   | Pass    | Pass    | Pass    | Pass    |
| axe-core, 0 violations in every state                      | vitest-axe                                        | Pass    | Pass    | Pass    | Pass    |
| axe-core on every Storybook story, light and dark          | Playwright + @axe-core/playwright                 | Pass    | Pass    | Pass    | Pass    |
| Keyboard contract from the APG pattern                     | Playwright, Chromium and Firefox                  | Pass    | Pass    | Pass    | Pass    |
| Focus ring, reduced motion, RTL, forced colours (emulated) | Playwright, Chromium (Firefox: no forced colours) | Pass    | Pass    | Pass    | Pass    |
| Announced role, name, and state                            | Guidepup virtual screen reader                    | Pass    | Pass    | Pass    | Pass    |
| Orca + Firefox (Linux)                                     | Manual                                            | Pending | Pending | Pending | Pending |
| TalkBack + Chrome (Android)                                | Manual                                            | Pending | Pending | Pending | Pending |

Not tested: NVDA, JAWS, Narrator, VoiceOver (macOS, iOS), real Windows High Contrast. Manual results are recorded in [docs/manual-testing.md](docs/manual-testing.md). Found a barrier? [Open an issue](https://github.com/Oyinbayode/keyline/issues) with the component, browser, assistive technology, and what you heard or expected.

## Bundle size

Minified + brotli, React excluded, enforced in CI by `size-limit` (see `.size-limit.json`):

| Import                                                                | Size    | Budget |
| --------------------------------------------------------------------- | ------- | ------ |
| `import { Switch } from '@oyinbayode/keyline'`                        | 624 B   | 750 B  |
| `import { Switch } from '@oyinbayode/keyline/switch'`                 | 624 B   | 750 B  |
| `import { Tabs } from '@oyinbayode/keyline'`                          | 1.6 kB  | 1.6 kB |
| `import { Tabs } from '@oyinbayode/keyline/tabs'`                     | 1.59 kB | 1.6 kB |
| `import { Dialog } from '@oyinbayode/keyline'`                        | 1.58 kB | 1.6 kB |
| `import { Dialog } from '@oyinbayode/keyline/dialog'`                 | 1.58 kB | 1.6 kB |
| `import { ToastProvider, useToast } from '@oyinbayode/keyline'`       | 2.09 kB | 2.3 kB |
| `import { ToastProvider, useToast } from '@oyinbayode/keyline/toast'` | 2.1 kB  | 2.3 kB |
| `@oyinbayode/keyline/primitives` (all)                                | 1.82 kB | 2 kB   |
| `@oyinbayode/keyline` (everything)                                    | 5.52 kB | 6.1 kB |
| `@oyinbayode/keyline/styles.css`                                      | 2.75 kB | 3 kB   |

## Contributing

```sh
pnpm install
pnpm storybook          # docs at localhost:6006
pnpm test               # unit, axe, virtual screen reader
pnpm build:storybook && pnpm test:e2e   # Playwright, Chromium + Firefox
pnpm lint && pnpm typecheck && pnpm build && pnpm size
```

- New components copy `src/components/switch/` as the template: component, CSS, unit + axe tests, screen-reader test, stories, and an MDX page in Problem → Solution form with a Keyboard table and What's tested.
- Every PR that changes the package needs a changeset: `pnpm changeset`.
- Never mark a manual screen-reader check as "pass" without having run it; "pending" is fine.

### Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets). Merged changesets open a "Version Packages" PR; merging it publishes to npm and tags `@oyinbayode/keyline@x.y.z`. Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers): `.github/workflows/release.yml` is registered as the package's trusted publisher on npmjs.com, so there is no npm token in the repository and every release carries a provenance attestation.

## License

[MIT](LICENSE) © Oyinbayode Akinleye
