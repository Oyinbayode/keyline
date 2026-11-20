---
'@oyinbayode/keyline': minor
---

Add `Menu` (`@oyinbayode/keyline/menu`), following the WAI-ARIA APG Menu Button pattern: `Menu.Root`, `Trigger`, `Content`, `Item` (with `onSelect` and `shortcut`), `CheckboxItem`, `RadioGroup`, `RadioItem`, `Group`, `Label` and `Separator`. The menu is a native popover anchored to its trigger with CSS anchor positioning (a measured placement where that is missing), so it needs no portal and works inside a modal `Dialog`. New primitives: `useAnchoredPopover` and `useTypeahead`.
