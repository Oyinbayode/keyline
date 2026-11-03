# Changesets

Every pull request that changes the published package adds a changeset:

```sh
pnpm changeset
```

Pick the bump (patch, minor, major; while Keyline is 0.x, breaking changes are minor) and write one line for the changelog from the user's point of view. The Release workflow turns merged changesets into a "Version Packages" pull request; merging that publishes to npm.
