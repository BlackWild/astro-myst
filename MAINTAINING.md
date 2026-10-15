# Maintaining astro-myst

This file covers the one-time setup of the repository, npm and GitHub Pages, and the release process. Everything else is automated by the workflows in `.github/workflows`.

| Workflow | Runs on | Does |
| --- | --- | --- |
| `ci.yml` | pushes to `main`, pull requests | Biome lint, type checks, tests (Linux/macOS/Windows, Node 22/24/26) with coverage, `publint` + Are the Types Wrong, compatibility builds (Astro 5/6/7, mystmd 1.3/1.8/latest), Playwright end-to-end tests, workflow security lint (zizmor), dependency review |
| `release.yml` | pushes to `main` | Opens the "Version Packages" pull request, or publishes to npm with trusted publishing when that pull request is merged |
| `docs.yml` | pushes to `main`, docs pull requests | Builds the documentation and deploys it to GitHub Pages |
| `codeql.yml` | pushes, pull requests, weekly | CodeQL code scanning for TypeScript and for the workflows |
| `scorecard.yml` | pushes to `main`, weekly | OpenSSF Scorecard |
| Dependabot | weekly | Grouped dependency and action updates, after a 7-day cooldown |

## One-time setup

Do these in order. Steps marked *optional* improve the setup but are not required for publishing.

### 1. GitHub repository settings

1. **Make the repository public** (*Settings → General → Danger zone*). npm provenance, free GitHub Pages and the OpenSSF Scorecard need a public repository.
2. **Allow the release workflow to open pull requests:** *Settings → Actions → General → Workflow permissions* → tick **Allow GitHub Actions to create and approve pull requests**. Keep the default token permission at *Read repository contents*; the workflows request what they need per job.
3. **Enable GitHub Pages:** *Settings → Pages → Build and deployment → Source:* **GitHub Actions**. Then re-run the *Docs* workflow (*Actions → Docs → Run workflow*). The site appears at <https://blackwild.github.io/astro-myst/>. Until Pages is enabled, the deploy job is skipped rather than failing.
4. **Create the `npm` environment** (*Settings → Environments → New environment* → `npm`). Under *Deployment branches and tags*, allow only `main`. *Optional:* add yourself as a *required reviewer* to approve every release by hand. (The environment is also created automatically on the first release, but without these protections.)
5. **Security features** (*Settings → Code security*): enable *Dependency graph*, *Dependabot alerts*, *Dependabot security updates*, *Secret scanning* with *Push protection*, and *Private vulnerability reporting* (used by `SECURITY.md`). For CodeQL, keep the workflow in this repository (*advanced setup*) — do not also enable *default setup*.
6. **Protect `main`** with a ruleset (*Settings → Rules → Rulesets → New branch ruleset*, target the default branch): require a pull request before merging, block force pushes and deletions, and require these status checks: `Lint & format`, `Type check`, `Test (ubuntu-latest, Node 24)`, `Package checks`, `End-to-end`. Add yourself to the bypass list if you want to be able to push directly in emergencies. **Read step 8 before requiring status checks.**
7. *Optional:* fill in the repository *About* box — website `https://blackwild.github.io/astro-myst/`, topics `astro`, `withastro`, `astro-loader`, `myst`, `mystmd`, `jupyter-book`, `latex`, `scientific-writing`.
8. *Optional, recommended with required status checks:* **a GitHub App for release pull requests.** Pull requests opened with the default `GITHUB_TOKEN` do not trigger other workflows, so the "Version Packages" pull request gets no CI checks — and cannot be merged if checks are required (unless you bypass the ruleset). With an app token the checks run normally:
   1. *Settings (your account) → Developer settings → GitHub Apps → New GitHub App*: any name (e.g. `astro-myst-release`), no webhook, repository permissions **Contents: Read and write** and **Pull requests: Read and write**, installable only on your account.
   2. Generate a private key, then install the app on `BlackWild/astro-myst`.
   3. In the repository, add the variable `RELEASE_APP_CLIENT_ID` (the app's *Client ID*, *Settings → Secrets and variables → Actions → Variables*) and the secret `RELEASE_APP_PRIVATE_KEY` (the contents of the `.pem` file). `release.yml` uses them automatically when they exist.

### 2. npm: first publish (bootstrap)

npm trusted publishing can only be configured for a package that already exists, so the first version is published by hand. Until then, `release.yml` skips publishing with a warning instead of failing.

1. Have an [npmjs.com](https://www.npmjs.com) account with **two-factor authentication** enabled.
2. Check that the name is still free: `npm view astro-myst` should answer `404 Not Found`. (If it is taken, rename the package in `packages/astro-myst/package.json`, for example to `@blackwild/astro-myst`, and replace the name in the docs, README files, `release.yml` and `.changeset/config.json`.)
3. Publish version 0.1.0 from a clean checkout of `main`:

   ```sh
   git clone https://github.com/BlackWild/astro-myst.git && cd astro-myst
   npm ci
   npm run build && npm test && npm run check:package
   npm login
   npm publish -w astro-myst --access public
   ```

   npm asks for your 2FA code. This first version has no provenance statement; every later version published by CI has one.

### 3. npm: trusted publishing

**Timing matters:** npm expires a new trusted-publisher configuration if it has not been used for a successful publish within **48 hours**. Set it up when the first automated release is about to happen — for example right before you merge the first "Version Packages" pull request (see *Releasing* below) — or recreate it if it expired.

On npmjs.com, open the package → **Settings → Trusted publishing → GitHub Actions** and enter exactly (all fields are case-sensitive):

| Field | Value |
| --- | --- |
| Organization or user | `BlackWild` |
| Repository | `astro-myst` |
| Workflow filename | `release.yml` |
| Environment name | `npm` |
| Allowed actions | **`npm publish`** (direct publishing) |

Or from the command line (npm 11.15 or newer, 2FA required):

```sh
npx npm@latest trust github astro-myst --repository BlackWild/astro-myst --file release.yml --environment npm --allow-publish
npx npm@latest trust list astro-myst
```

After the first successful automated release:

1. On npmjs.com, *package → Settings → Publishing access*: choose **Require two-factor authentication and disallow tokens**. Trusted publishing keeps working because it does not use tokens.
2. Revoke npm access tokens you no longer need (*Account → Access Tokens*).
3. Check the release page on npm shows the provenance badge ("Built and signed on GitHub Actions").

If you ever rename or transfer the repository, delete the trusted publisher on npm and create a new one for the new name.

## Releasing

1. Every pull request that changes the published package includes a changeset (`npx changeset`).
2. When such pull requests are merged, `release.yml` opens or updates a pull request named **"chore: version packages"**. It bumps the version in `packages/astro-myst/package.json`, writes `CHANGELOG.md` (with links to the pull requests and authors) and syncs `src/version.ts`.
3. Review and merge it. `release.yml` then builds, tests and packs the package, publishes it to npm with provenance (through the `npm` environment, waiting for your approval if you added required reviewers), and creates the git tag `astro-myst@x.y.z` and a GitHub release with the changelog.

To release by hand in an emergency (only possible while tokens are allowed): `npm run version-packages`, commit, then `npm run release` with an authenticated npm.

### Pre-releases

Use [Changesets pre-release mode](https://changesets.dev/guide/prereleases): `npx changeset pre enter next`, merge changesets as usual (versions become `x.y.z-next.n` and are published under the `next` tag), and `npx changeset pre exit` when done.

## Keeping things current

- **Dependabot** opens grouped pull requests every Monday. `katex` is held at 0.15.x on purpose: its CSS must match the KaTeX version mystmd renders with.
- **mystmd** updates: the compatibility job builds the book example against old and new mystmd versions. When mystmd changes its page format (`version` in `_build/site/content/*.json`), update `SUPPORTED_PAGE_VERSIONS` in `packages/astro-myst/src/compile.ts` after testing.
- **Astro** majors: add the new major to the `compat` matrix in `ci.yml` and to `peerDependencies`.
- **Node.js**: `.node-version` sets the version used by most CI jobs; the test matrix covers the maintained LTS lines.
- **GitHub Actions** are pinned to commit SHAs (with the version in a comment); Dependabot updates them.
