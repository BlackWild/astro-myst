---
title: Loader options
label: ref-loader-options
description: Every option of mystLoader().
---

```ts
import { mystLoader } from 'astro-myst';

mystLoader({ root: './content' /* , ...options */ });
```

## Project

`root` (required)
: Folder of the MyST project — the folder that contains `myst.yml` — relative to the Astro project root.

`project`
: For MyST sites with several projects (`site.projects` in `myst.yml`): the `slug` of the project to load. Default: the first project. See [](#guide-multiple-projects).

`extraInputs`
: Files or folders outside `root` that the project reads, such as an included README, an `extends:` configuration or a shared bibliography. Relative to the Astro root. They are watched in `astro dev` and part of the cache key. Default: `[]`.

## URLs and assets

`routeBase`
: URL prefix, below Astro's `base`, where you route the pages — for example `'/book/'` for `src/pages/book/[...slug].astro`. Default: `'/'`.

`assetsDir`
: Sub-folder of `public/` that receives images, notebook outputs and downloads referenced by the pages. It must stay inside `public/`. Default: `'_myst/<collection name>'`.

## Compilation

`command`
: Executable used instead of the `mystmd` npm package, for example `'myst'` installed with pip or conda, or `'jupyter-book'`. It must support `build --site`. Default: the `mystmd` package resolved from your project, then `myst` on the `PATH`.

`mystArgs`
: Extra flags for `myst build --site`. Useful values: `['--execute']` to run notebooks, `['--strict']` to fail the build on mystmd errors. Default: `[]`.

`skipThemeDownload`
: `myst build --site` normally downloads MyST's React theme, which an Astro site does not need. When `true`, a temporary stub is placed in `_build/templates` for the duration of the build and removed afterwards; a real theme that is already there is never touched. Default: `true`.

`cache`
: Reuse the previous mystmd output when no file in `root` (or `extraInputs`) changed since the last build. Rendering always runs. Default: `true`.

## Rendering

`codeThemes`
: [Shiki themes](https://shiki.style/themes) for code blocks, as `{ light, dark }`, or `false` to disable highlighting. Default: `{ light: 'github-light', dark: 'github-dark' }`.

`numberedReferences`
: Render citations as `[1]` instead of author–year, with a numbered bibliography. Default: `site.options.numbered_references` from `myst.yml`, otherwise `false`.

`bibliographyTitle`
: Heading of the per-page bibliography. Default: `'References'`.

`footnotesTitle`
: Heading of the per-page footnotes. Default: `'Footnotes'`.

`handlers`
: Custom renderers keyed by MyST node type. See [](#guide-custom-renderers). Default: `{}`.

## Behaviour in `astro dev`

The loader watches `root` and `extraInputs`. A change recompiles the whole MyST project (so numbering and references stay consistent everywhere) and updates all entries. If a rebuild fails, the error is logged and the previous pages stay available. In `astro build`, a failed compilation fails the build.
