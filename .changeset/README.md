# Changesets

This folder holds pending release notes. Add one with:

```sh
npx changeset
```

Pick the packages that changed (only `astro-myst` is published), the kind of change (`patch`, `minor`, `major`) and write a short summary for users. When the pull request is merged, the Release workflow collects all changesets into a "Version Packages" pull request; merging that one publishes to npm.

See the [Changesets documentation](https://changesets.dev) for details.
