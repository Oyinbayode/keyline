# @oyinbayode/keyline

## 0.2.0

### Minor Changes

- 2473f52: Add `Dialog` (`Dialog.Root`, `Dialog.Trigger`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description`, `Dialog.Close`), a modal dialog following the WAI-ARIA APG Dialog (Modal) pattern and built on the native `<dialog>` element with `showModal()`. React state and the element stay in sync (Esc and browser-initiated closes report through `onOpenChange`, and a controlled parent can refuse), focus goes to `initialFocus` or the first tabbable element and returns on close, backdrop clicks ignore text drags, page scroll is locked without layout shift, and nested dialogs close one at a time. Available from `@oyinbayode/keyline` and `@oyinbayode/keyline/dialog`.
- 65888f3: State without stripes. Vertical `Tabs` mark the selected tab with a 2px keyline under the label (a new inner `span.kl-tab-label`) instead of a bar down one side, and separate the list from the panel with space instead of a divider. Toasts drop the coloured inline-start border for an even 1px border, a slug line (tone icon, tone name, and PAUSED or HELD) and a 1px fuse that burns down with the countdown, pauses with it, and stays still under reduced motion. New `ToastProvider` props `toneLabels`, `pausedLabel` and `heldLabel` localise those words. New tokens `--kl-success-text`, `--kl-warning-text` and `--kl-danger-text` give the status colours 4.5:1 as text.
- c9b9cc4: Add `Tabs` (`Tabs.Root`, `Tabs.List`, `Tabs.Tab`, `Tabs.Panel`), following the WAI-ARIA APG Tabs pattern: roving tabindex, arrow keys that follow reading direction, automatic and manual activation, selection that falls back when the selected tab is disabled or removed, and a forced-colours-safe selected keyline. Available from `@oyinbayode/keyline` and `@oyinbayode/keyline/tabs`. Also adds the `useRovingFocus` primitive to `@oyinbayode/keyline/primitives`.
- 3110805: Add `ToastProvider`, `useToast()` and the `Toast` parts (`Toast.Root`, `Toast.Title`, `Toast.Description`, `Toast.Action`, `Toast.Close`). Toasts never take focus and are announced exactly once through two persistent live regions (polite, and assertive for `danger`). Timers have a 5-second minimum and pause on hover, focus, and a hidden or blurred window; toasts with an action never time out. The notifications landmark is reachable with F8, queues above `limit`, and moves into the topmost open Keyline `Dialog` so it is never made inert. Available from `@oyinbayode/keyline` and `@oyinbayode/keyline/toast`.

## 0.1.0

### Minor Changes

- 9014c1f: Design tokens: 12-step `--kl-slate-*` and `--kl-blue-*` scales declared with `light-dark()`, plus `--kl-success`, `--kl-warning`, and `--kl-danger`. The `--kl-color-*` aliases keep working and now point at scale steps. New tokens for space 5–8, radius `lg` and `xl`, `--kl-shadow-raised` and `--kl-shadow-floating`, a double `--kl-focus-ring`, `--kl-duration-slow`, `--kl-ease`, and `--kl-ease-spring` (`--kl-easing` and `--kl-font-family-mono` remain as aliases). `--kl-font-family` is now `inherit`: components take the page's font instead of a system stack. `--kl-radius-md` changes from 8px to 6px.
  
  Switch is restyled on the scales: 1px border, 16px thumb on a spring easing, colour-only disabled state, and the double focus ring. Behaviour, markup, and props are unchanged.
  
  Fixes a `ReferenceError` when the ESM build is loaded unbundled in a browser with no `process` global.

## 0.0.1

### Patch Changes

- a535a5b: First release: `Switch` (WAI-ARIA APG switch pattern, controlled and uncontrolled, form support), the `useControllableState`, `useId`, `Portal`, and `FocusScope` primitives, and a token-driven stylesheet with light and dark themes, reduced-motion, forced-colours, and right-to-left support.
