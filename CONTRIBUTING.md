# Contributing to astro-myst

Thanks for helping! Bug reports, documentation fixes and pull requests are all welcome.

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/astro-myst` | The published package: loader, compiler wrapper, renderer, styles, `XrefPreview` component, unit and integration tests |
| `docs` | The documentation site — written in MyST and rendered with astro-myst |
| `examples/minimal`, `examples/book`, `examples/paper` | Example sites, also used by the end-to-end tests |
| `e2e` | Playwright tests against the built examples |
| `.changeset` | Pending release notes ([Changesets](https://changesets.dev)) |

## Setup

You need Node.js 22.12 or newer (the version in `.node-version` is used in CI) and npm 10.9 or newer.

```sh
git clone https://github.com/BlackWild/astro-myst.git
cd astro-myst
npm install
npm run build   # compile the package; the docs and examples import its build output
```

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Rebuild the package on change |
| `npm run docs:dev` | Documentation site with live reload |
| `npm run dev -w astro-myst-example-book` | An example site with live reload |
| `npm run lint` / `npm run lint:fix` | Lint and format check with Biome / apply fixes |
| `npm run typecheck` | TypeScript and `astro check` for all workspaces |
| `npm test` | Unit and integration tests (they run the real mystmd) |
| `npm run test:coverage` | Tests with coverage report in `packages/astro-myst/coverage` |
| `npm run test:e2e` | Build the examples and run the Playwright tests |
| `npm run check:package` | `publint` and Are the Types Wrong on the packed package |

## Making a change

1. Create a branch and make your change, with tests where it makes sense. Integration tests use small MyST projects in `packages/astro-myst/test/fixtures`.
2. Run `npm run lint`, `npm run typecheck` and `npm test`.
3. If the change affects users of the package, add a changeset and describe it for the release notes:

   ```sh
   npx changeset
   ```

   Pick `patch` for fixes, `minor` for new features and `major` for breaking changes. Documentation, examples and CI changes need no changeset.
4. Open a pull request. CI runs linting, type checks, tests on Linux, macOS and Windows, package checks, the examples against Astro 5, 6 and 7, the end-to-end tests and a documentation build.

## Releases

Releases are automated with Changesets and npm trusted publishing:

1. Merged changesets make the **Release** workflow open (or update) a "Version Packages" pull request with the new version and changelog.
2. Merging that pull request publishes the package to npm from GitHub Actions — with provenance and without any npm token — and creates a GitHub release.

Maintainers: see [MAINTAINING.md](./MAINTAINING.md) for the one-time setup.

## Code of conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Please be kind.
