---
'@oyinbayode/keyline': minor
---

State without stripes. Vertical `Tabs` mark the selected tab with a 2px keyline under the label (a new inner `span.kl-tab-label`) instead of a bar down one side, and separate the list from the panel with space instead of a divider. Toasts drop the coloured inline-start border for an even 1px border, a slug line (tone icon, tone name, and PAUSED or HELD) and a 1px fuse that burns down with the countdown, pauses with it, and stays still under reduced motion. New `ToastProvider` props `toneLabels`, `pausedLabel` and `heldLabel` localise those words. New tokens `--kl-success-text`, `--kl-warning-text` and `--kl-danger-text` give the status colours 4.5:1 as text.
