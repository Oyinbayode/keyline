# Contributing

## Setup

```sh
pnpm install
pnpm storybook          # docs at localhost:6006
pnpm test               # unit, axe, virtual screen reader
pnpm build:storybook && pnpm test:e2e   # Playwright, Chromium + Firefox
pnpm lint && pnpm typecheck && pnpm build && pnpm size
```

## Pull requests

**Title.** A conventional commit line, imperative, under 72 characters: `feat(tabs): add vertical orientation`.

**Description.** These sections, in this order, each only when it applies. The [template](.github/pull_request_template.md) has them.

1. **Summary**: what changed and why, in 2–4 sentences.
2. **Changes**: bullets grouped by area: component, styles, docs, tooling.
3. **Accessibility**: the pattern followed, keyboard behaviour, and what screen reader users will notice.
4. **Testing**: what ran, with counts, and what was not tested.
5. **Size**: a before/after table when package code changes.
6. **Screenshots**: dark and light when anything visual changes.
7. **Trade-offs**: decisions a reviewer might question, and known limitations.

**Only the change.** PRs, commit messages and review comments describe the change itself. They never carry steps for the owner, account setup or secret housekeeping, or process talk about who asked for what.

**Review comments.** One issue per comment: the problem, the evidence, and the suggested fix.

**Merging.** A merge commit titled with the PR title; delete the branch afterwards.
