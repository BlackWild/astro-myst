# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

astro-myst is an Astro content loader for MyST Markdown. It does **not** parse MyST itself: it runs the official `mystmd` CLI (`myst build --site`), reads the fully resolved per-page JSON AST that mystmd writes to `<mystRoot>/_build/site/`, renders that AST to HTML and stores one Astro content entry per page. All MyST semantics (numbering, cross-page references, citations and DOIs, KaTeX, includes, notebooks, LaTeX parsing) come from mystmd; this package maps nodes to HTML and rewrites MyST URLs into Astro URLs.

It is an npm-workspaces monorepo. The published package is `packages/astro-myst`. `examples/{minimal,book,paper}` and `docs/` (the documentation site, written in MyST and rendered by astro-myst itself) import the package's **built** `dist/`, so run `npm run build` before building or type-checking them.

## Commands

Node >= 22.12, npm >= 10.9. Run from the repo root.

```sh
npm ci && npm run build        # the build is required before docs/examples/typecheck
npm run lint                   # Biome lint + format check (lint:fix applies fixes)
npm run typecheck              # tsc for the package and e2e, astro check for docs and examples
npm test                       # vitest; integration tests run the real mystmd (~15 s)
npm test -w astro-myst -- test/urls.test.ts -t "folder slugs"   # one file / one test
npm run test:coverage          # thresholds in packages/astro-myst/vitest.config.ts
npm run examples:build && npm run docs:build && npm run test:e2e  # Playwright against the built sites
npm run check:package          # publint + Are the Types Wrong
npm run dev -w astro-myst-example-book   # live example (npm run docs:dev for the docs)
```

In Claude Code cloud containers, point Playwright at the preinstalled browser instead of downloading one: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium npm run test:e2e`.

## Architecture (`packages/astro-myst/src`)

Pipeline: **compile** (mystmd) → **render** (AST → HTML) → **store** (content layer) → **copy assets** (to `public/<assetsDir>`).

- `compile.ts` runs mystmd.
  - `resolveCommand`: the `command` option, else the `mystmd` npm package resolved from the Astro root, the MyST root, then astro-myst's own folder (run as `node <bin>`), else `myst` on PATH.
  - Seeds a stub site template in `_build/templates/…` (marked by `.astro-myst-stub`) so `myst build --site` never downloads MyST's React theme, and removes it afterwards. A real template is never touched.
  - Wipes `_build/site` before every build and serializes builds per root with an in-process lock. mystmd output lines starting with `⚠️` become warnings, `⛔`/`error` become errors.
  - `readMystBuild` reads `config.json` (projects, TOC) and `content/**/*.json` (pages keyed `<slug>`, or `<project>/<slug>` for multi-project sites), and warns on a page `version` outside `SUPPORTED_PAGE_VERSIONS`. `site.options` and `site.projects[].path` are read from `myst.yml` directly because `config.json` drops them.
- `loader.ts` is `mystLoader()`, the Astro Content Layer loader.
  - Cache key: path, size and mtime of every file under the MyST root and `extraInputs`, plus the package version, mystmd label and args, kept in the loader's `meta`. Astro's `public/`, `outDir`, `cacheDir` and `node_modules` are excluded (unless they contain the MyST root), as is `myst.doi.bib` under `--doi-bib`. Anything written during a build must be excluded, or `astro dev` rebuilds in a loop.
  - Loads one project (`project` option, default the first); `order` and `level` come from the MyST TOC. Maps MyST page URLs (`/theory`) to Astro URLs via `urls.ts`, honouring Astro `base`, `trailingSlash` and the `routeBase` option.
  - `sync()` renders every page before mutating anything, then replaces `public/<assetsDir>` (validated to stay inside `public/`, because it is deleted recursively) and clears and refills the store. Without a watcher (`astro build`) errors throw with an `[astro-myst]` prefix; with a watcher (`astro dev`) they are logged and the previous entries stay.
  - In dev, any change triggers a full recompile (200 ms debounce, queued). This is intentional: numbering is global across pages.
- `render.ts` holds `MystRenderer`, a large `switch` in `builtin()` that maps MyST node types to hast (hastscript), serialized with `hast-util-to-html` and `allowDangerousHtml` because mystmd supplies KaTeX and citation HTML as raw strings.
  - `one()` applies notebook `visibility` (remove/hide). `render()` tries user `handlers` first: a handler returns `undefined` to fall back to the built-in renderer, `null` to render nothing, and can wrap built-in output with `ctx.renderDefault`.
  - Unknown node types fall back to `div`/`span.myst-<type>`; rendering must never throw on new node types.
  - Shiki highlighters are cached per theme pair at module level; `prepare()` loads only the languages a page uses.
  - Footnotes and the bibliography are collected during the walk and appended to each page.
  - Notebook outputs: both the mystmd >= 1.7 format (`jupyter_data`) and the older `data[]` list, plus large outputs that mystmd stores as files (`readAsset`).
- `urls.ts` holds pure helpers. `slugToPath` mirrors mystmd's `slugToUrl`: with `site.options.folders: true`, `a.b` maps to `a/b` and `a.index` to `a`.
- `components/XrefPreview.astro` is a client-side custom element. On hover or focus of `a.xref, a.cite` it fetches the target page, clones the element with the target id and shows it as a tooltip.

## Conventions and gotchas

- **The rendered HTML is a public contract.** Tests assert exact HTML strings (`render.test.ts`, `latex.test.ts`, `doi.test.ts`), `styles/myst.css` and `XrefPreview.astro` depend on the class names and ids, and `docs/content/reference/components-and-styles.md` documents the markup. Changing markup means updating all of them.
- Integration tests copy a fixture (`test/fixtures/<name>`, each a MyST project with `myst.yml`) to a temp folder with `copyFixture`; tests never build inside the repo. Loader tests use a hand-rolled fake `LoaderContext` in `loader.test.ts`. The DOI test seeds mystmd's `_build/cache` to stay offline.
- `src/version.ts` is generated by `scripts/sync-version.mjs` (on `prebuild` and in `npm run version-packages`); do not edit it.
- `test/readme.test.ts` keeps the README's custom-handler example compiling. The root `README.md` and `packages/astro-myst/README.md` (shown on npm) are separate near-copies; keep them in sync.
- `katex` stays on 0.15.x on purpose: its CSS must match the KaTeX version mystmd renders with.
- A new mystmd page format: test it, then add the version to `SUPPORTED_PAGE_VERSIONS` in `compile.ts`. A new Astro major: add it to `peerDependencies` and to the `compat` matrix in `.github/workflows/ci.yml`.
- Changes to the published package need a changeset (`npx changeset`; patch, minor or major). Docs, examples and CI changes do not. Releases are automated (a Changesets "Version Packages" pull request, then npm trusted publishing); see `MAINTAINING.md`.
- Style is enforced by Biome: 2 spaces, single quotes, trailing commas, semicolons, 120 columns. `noExplicitAny` is off because the MyST AST is loosely typed (`MystNode` has `[key: string]: any`). ESM with `.js` import specifiers (NodeNext).
- Generated and git-ignored: `_build/`, `public/_myst/`, `public/pagefind/`, `dist/`. mystmd's asset file names (`name-<hash>.ext`) differ between checkouts even for identical content, so never commit them.

## CI

`ci.yml` runs Biome, type checks, tests on Ubuntu (Node 22/24/26), macOS and Windows, package checks, a compat job and Playwright e2e, plus zizmor. Keep path handling and process spawning cross-platform (`compile.ts` handles Windows `.cmd` shims). The compat job builds the book example from the packed tarball against Astro 5/6/7 and mystmd 1.3/1.8/latest, so older mystmd output formats must keep working. Actions are pinned to commit SHAs.

Limitations by design (`docs/content/explanation/limitations.md`): static output only, one MyST project per collection, a full recompile on every change, and `myst.yml` `site.options` theme options are ignored except `numbered_references` and `folders`.
