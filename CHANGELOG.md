# keyline

## 0.1.0

### Minor Changes

- 9014c1f: Design tokens: 12-step `--kl-slate-*` and `--kl-blue-*` scales declared with `light-dark()`, plus `--kl-success`, `--kl-warning`, and `--kl-danger`. The `--kl-color-*` aliases keep working and now point at scale steps. New tokens for space 5–8, radius `lg` and `xl`, `--kl-shadow-raised` and `--kl-shadow-floating`, a double `--kl-focus-ring`, `--kl-duration-slow`, `--kl-ease`, and `--kl-ease-spring` (`--kl-easing` and `--kl-font-family-mono` remain as aliases). `--kl-font-family` is now `inherit`: components take the page's font instead of a system stack. `--kl-radius-md` changes from 8px to 6px.
  
  Switch is restyled on the scales: 1px border, 16px thumb on a spring easing, colour-only disabled state, and the double focus ring. Behaviour, markup, and props are unchanged.
  
  Fixes a `ReferenceError` when the ESM build is loaded unbundled in a browser with no `process` global.

## 0.0.1

### Patch Changes

- a535a5b: First release: `Switch` (WAI-ARIA APG switch pattern, controlled and uncontrolled, form support), the `useControllableState`, `useId`, `Portal`, and `FocusScope` primitives, and a token-driven stylesheet with light and dark themes, reduced-motion, forced-colours, and right-to-left support.
