---
'@oyinbayode/keyline': minor
---

Add `Combobox` (`@oyinbayode/keyline/combobox`), an editable combobox with list autocomplete following the WAI-ARIA APG Combobox pattern: `Combobox.Root`, `Label`, `Input`, `Trigger`, `Content`, `Option`, `Group`, `GroupLabel` and `Empty`. Focus stays in the input with `aria-activedescendant`, nothing is chosen until the user moves to an option, the result count is announced once typing settles (`resultsMessage` localises it), and the default filter ignores case and accents. The list is a manual native popover anchored to the input, and `name` submits the chosen value with a form.
