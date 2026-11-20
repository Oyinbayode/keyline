---
'@oyinbayode/keyline': minor
---

Add `ToastProvider`, `useToast()` and the `Toast` parts (`Toast.Root`, `Toast.Title`, `Toast.Description`, `Toast.Action`, `Toast.Close`). Toasts never take focus and are announced exactly once through two persistent live regions (polite, and assertive for `danger`). Timers have a 5-second minimum and pause on hover, focus, and a hidden or blurred window; toasts with an action never time out. The notifications landmark is reachable with F8, queues above `limit`, and moves into the topmost open Keyline `Dialog` so it is never made inert. Available from `@oyinbayode/keyline` and `@oyinbayode/keyline/toast`.
