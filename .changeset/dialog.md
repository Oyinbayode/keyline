---
'@oyinbayode/keyline': minor
---

Add `Dialog` (`Dialog.Root`, `Dialog.Trigger`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description`, `Dialog.Close`), a modal dialog following the WAI-ARIA APG Dialog (Modal) pattern and built on the native `<dialog>` element with `showModal()`. React state and the element stay in sync (Esc and browser-initiated closes report through `onOpenChange`, and a controlled parent can refuse), focus goes to `initialFocus` or the first tabbable element and returns on close, backdrop clicks ignore text drags, page scroll is locked without layout shift, and nested dialogs close one at a time. Available from `@oyinbayode/keyline` and `@oyinbayode/keyline/dialog`.
