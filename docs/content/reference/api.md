---
title: JavaScript API
label: ref-api
description: Lower-level functions for compiling and rendering MyST outside the content loader.
---

`mystLoader()` covers most needs. The functions below are exported for custom loaders, live collections, scripts or tests.

## `compileMystProject(options)`

Runs `myst build --site` in a MyST project and returns its output.

```ts
import { compileMystProject } from 'astro-myst';

const build = await compileMystProject({
  root: '/absolute/path/to/content',
  logger: console, // { info, warn, error, debug }
});
```

| Option | Description |
|---|---|
| `root` | Absolute path of the folder containing `myst.yml` |
| `resolveFrom` | Folder from which the `mystmd` package is resolved first (default: `root`) |
| `command` | Executable to use instead of the `mystmd` package |
| `args` | Extra CLI flags |
| `skipThemeDownload` | See [](#ref-loader-options) (default `true`) |
| `logger` | Receives mystmd's messages; warnings and errors keep mystmd's file/line information |

Builds of the same project are serialised, so concurrent calls never share a half-written `_build` folder.

The result (`MystBuild`):

| Field | Description |
|---|---|
| `pages` | `Map` of page slug → page JSON (`"<project>/<slug>"` for multi-project sites) |
| `config` | The site manifest (`_build/site/config.json`) with the table of contents |
| `publicDir` | Folder with images and downloads referenced by the pages |
| `siteOptions` | `site.options` from `myst.yml` |
| `projectPaths` | Folder of each project of a multi-project site |
| `xref` | The cross-reference inventory (`myst.xref.json`) |

## `readMystBuild(root, logger)`

Reads the output of a previous build from `<root>/_build/site` without compiling.

## `renderMystPage(page, options)`

Renders one page JSON to HTML and returns `{ html, headings }`.

```ts
import { renderMystPage } from 'astro-myst';

const { html, headings } = await renderMystPage(build.pages.get('theory')!, {
  resolvePageUrl: (mystUrl) => `/docs${mystUrl === '/' ? '' : mystUrl}`,
  resolveAssetUrl: (url) => `/docs/_myst${url}`,
});
```

| Option | Description |
|---|---|
| `resolvePageUrl(mystUrl)` | Maps a MyST page URL (`/`, `/theory`) to your URL; return `undefined` for unknown pages |
| `resolveAssetUrl(url)` | Maps an asset URL (`/fig-1a2b.png`) to its public URL |
| `readAsset(url)` | Returns the text of a build asset (used for large notebook outputs) |
| `codeThemes`, `handlers`, `numberedReferences`, `bibliographyTitle`, `footnotesTitle` | As in [](#ref-loader-options) |

## URL helpers

`pageUrl`, `assetUrl`, `joinUrl`, `slugToPath` and `slugToMystUrl` implement the URL mapping used by the loader. `citeId(label)` returns the element id of a bibliography entry.

## Other exports

- `mystPageSchema` — the Zod schema of entry data, for example to extend it in a custom loader
- `VERSION` — the installed version of astro-myst
- Types: `MystLoaderOptions`, `MystPageData`, `MystNodeHandler`, `MystRenderContext`, `RenderOptions`, `RenderResult`, `MarkdownHeading`, `MystBuild`, `MystPageJson`, `MystNode`, `MystCitation`, `MystLogger`, `HastChild`, `RawNode`, `CompileOptions`, `TrailingSlash`
