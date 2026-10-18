---
title: Options
label: ref-options
description: Every option of the myst() integration and of mystLoader(), and how the options of 0.1 map to them.
---

astro-myst has two places for options:

- the **integration**, `myst()` in `astro.config`, for settings shared by every MyST collection;
- the **loader**, `mystLoader()` in `src/content.config.ts`, for one collection.

The [render settings](#ref-options-render) are accepted by both; a loader's value overrides the integration's.

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

export default defineConfig({
  integrations: [
    myst({
      project: { numbering: { headings: true }, math: { '\\dd': '\\mathrm{d}' } },
      styles: 'theme',
    }),
  ],
});
```

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  book: defineCollection({
    loader: mystLoader({
      base: './src/content/book',
      toc: [{ file: 'index.md' }, { file: 'theory.md', children: [{ file: 'methods.md' }] }],
      route: '/',
      project: { numbering: { title: true, headings: true } },
    }),
  }),
};
```

(ref-options-integration)=
## Integration options

`myst(options)`, with the type `MystOptions`. All options are optional.

| Option | Type | Default | Description |
|---|---|---|---|
| `project` | `object` | `{}` | MyST project options shared by every collection. See [below](#ref-options-project). |
| `styles` | `'base'`, `'theme'` or `false` | `'base'` | Stylesheets added to every page. See [below](#ref-options-styles). |
| `command` | `string` | the `mystmd` package | Executable to run instead of the `mystmd` npm package, for example `'myst'` installed with pip or conda, or `'jupyter-book'`. It must support `build --site`. |
| `args` | `string[]` | `[]` | Extra flags for `myst build --site`, for every collection. Useful values: `['--execute']` to run notebooks, `['--strict']` to fail on mystmd errors. |
| `codeThemes`, `handlers`, `numberedCitations`, `labels` | | | [Render settings](#ref-options-render) for every collection. |

Without `command`, astro-myst runs the `mystmd` package installed in your project (or next to astro-myst), and falls back to a `myst` executable on the `PATH`.

(ref-options-project)=
### `project`

Anything the `project:` section of a `myst.yml` accepts: `numbering`, `math` macros, `abbreviations`, `bibliography`, `references` to other MyST sites, `plugins`, `authors`, `license` and so on. See MyST's [frontmatter reference](https://mystmd.org/guide/frontmatter).

```ts
myst({
  project: {
    numbering: { title: true, equation: { continue: true } },
    math: { '\\dd': '\\mathrm{d}' },
    abbreviations: { TLS: 'two-level system' },
    bibliography: ['src/content/references.bib'],
    references: { mystmd: 'https://mystmd.org/guide' },
  },
});
```

- File paths (`bibliography`, `plugins`, `thumbnail`, `banner`) are relative to the Astro project root. These files are watched in `astro dev`.
- Without a `bibliography`, the `.bib` files inside a collection's `base` are used.
- Pages inherit some keys from the project, as in MyST: for example `authors`, `date`, `license` and `numbering` apply to every page that does not set its own.
- `toc` is ignored here: use the loader's `toc` option.

(ref-options-styles)=
### `styles`

| Value | Added to every page |
|---|---|
| `'base'` | `astro-myst/katex.css` and `astro-myst/base.css`: math, and the few rules MyST content needs to work. They have zero specificity, so your CSS, Tailwind utilities and `prose` always win. |
| `'theme'` | The same, plus `astro-myst/theme.css`, an optional theme for admonitions, figures, code blocks, cross-references and more. |
| `false` | Nothing. Import `astro-myst/katex.css`, `astro-myst/base.css` and `astro-myst/theme.css` yourself where you need them. |

Any other value is an error. See [](#guide-styling) and [](#ref-components).

(ref-options-loader)=
## Loader options

`mystLoader(options)`, imported from `astro-myst/loaders`, with the type `MystLoaderOptions`. Only `base` is required. The loader needs the integration: without `myst()` in `astro.config`, it fails with an error saying so.

| Option | Type | Default | Description |
|---|---|---|---|
| `base` | `string` | required | Folder of the collection, relative to the Astro project root, as for `glob()`. |
| `pattern` | `string` or `string[]` | `'**/[^_]*.{md,ipynb}'` | Glob(s) below `base` of the files that become entries. See [below](#ref-options-pattern). |
| `toc` | `MystTocEntry[]` | `index` first, then by path | Order and nesting of the pages, in the format of a MyST `toc`, with paths relative to `base`. See [](#guide-routing-toc). |
| `route` | `string` or `(id) => string` | `'/<collection name>'` | Where you serve the pages, so that links between them work. See [](#guide-routing-route). |
| `project` | `object` | `{}` | [MyST project options](#ref-options-project) for this collection, merged over the integration's `project`. |
| `args` | `string[]` | `[]` | Extra flags for `myst build --site`, appended to the integration's `args`. |
| `extraInputs` | `string[]` | `[]` | Files or folders outside `base` that pages read, for example a README included with `{include}`. Relative to the Astro root. They are watched in `astro dev` and part of the cache key. |
| `generateId` | `({ entry, base, data }) => string` | ids like `glob()` | Custom entry ids, as for `glob()`: `entry` is the file path relative to `base`, `base` the folder as a `URL`, `data` the file's frontmatter. |
| `cache` | `boolean` | `true` | Reuse the previous mystmd build while no input changed. Rendering always runs. |
| `codeThemes`, `handlers`, `numberedCitations`, `labels` | | the integration's | [Render settings](#ref-options-render) for this collection. |

The loader's `project` is merged with the integration's at the top level only: a key you set here replaces the integration's value for that key. For example, `numbering: { title: true }` on the loader replaces the whole `numbering` of the integration.

(ref-options-pattern)=
### `pattern`

By default, Markdown files and notebooks become entries, except those whose name starts with `_`. Use that prefix for snippets that pages only `{include}`. Folders such as `node_modules`, `_build`, `.git` and `.ipynb_checkpoints` are always ignored.

LaTeX files are not included by default. Add them to the pattern, or list them in `toc`:

```ts
mystLoader({ base: './src/content/paper', pattern: '**/[^_]*.{md,ipynb,tex}' });
```

(ref-options-render)=
## Render settings

These settings control how MyST content becomes HTML. Set them on the integration for every collection, or on a loader for one collection.

| Option | Type | Default | Description |
|---|---|---|---|
| `codeThemes` | `{ light, dark }` or `false` | `{ light: 'github-light', dark: 'github-dark' }` | [Shiki themes](https://shiki.style/themes) for code blocks, or `false` to turn highlighting off. `base.css` switches to the dark theme in dark mode. |
| `handlers` | `Record<string, MystNodeHandler>` | `{}` | Custom renderers keyed by MyST node type. The integration's and the loader's are combined; for the same node type, the loader's wins. See [](#guide-custom-renderers). |
| `numberedCitations` | `boolean` | `false` | Numbered citations: `[3]` in parentheses, `Knuth [3]` in running text, with a numbered bibliography. By default citations are author–year. |
| `labels` | `{ references?, footnotes? }` | `'References'`, `'Footnotes'` | Headings of the bibliography and footnote sections appended to pages. Set per key; a loader's keys override the integration's. |

## Behaviour in `astro dev`

The loader watches `base`, `extraInputs` and the files that `project` points to (bibliographies, plugins). Any change recompiles the whole collection, so numbering and references stay consistent on every page, and Astro updates the pages. If a rebuild fails, the error is logged and the previous pages stay available. In `astro build`, a failed compilation fails the build with a message starting with `[astro-myst]`.

(ref-options-migration)=
## Migrating from 0.1

astro-myst 0.2 replaces `myst.yml` with options in your Astro config and makes the loader work like `glob()`. The table maps every option and field of 0.1 to its replacement. See also [](#getting-started) for the upgrade steps.

| 0.1 | 0.2 |
|---|---|
| `content/myst.yml` | The integration's `project` option and the loader's `toc`, `project` and `pattern` options; no `myst.yml` |
| `import { mystLoader } from 'astro-myst'` | `import { mystLoader } from 'astro-myst/loaders'`, plus `integrations: [myst()]` in `astro.config` |
| `mystLoader({ root })` | `mystLoader({ base })`, plus `pattern` |
| `routeBase` | `route` (a prefix or a function); the default changed from `/` to `/<collection name>` |
| `mystArgs` | `args` |
| `command` | The integration's `command` option |
| `assetsDir`, `skipThemeDownload`, `project` (project of a multi-project site) | Removed |
| `numberedReferences`, `myst.yml` `site.options.numbered_references` | `numberedCitations` |
| `myst.yml` `site.options.folders` | Not needed: ids always follow folders, as with `glob()` |
| `bibliographyTitle`, `footnotesTitle` | `labels: { references, footnotes }` |
| `entry.id`: MyST's page slug (`part-1.intro`) | `entry.id`: the file path, as with `glob()` (`part-1/intro`) |
| `data.path` | `entry.id` (`'index'` for the root page) |
| `data.url`, `data.order`, `data.level`, `data.enumerator`, `data.kind` | `data.myst.url`, `data.myst.order`, `data.myst.level`, `data.myst.enumerator`, `data.myst.kind` |
| `data.isIndex` | `entry.id === 'index'` |
| `data.source` | `entry.filePath` (relative to the Astro root) |
| `data.projectTitle` | Removed: you set the project title in your layout |
| `data.frontmatter` | `remarkPluginFrontmatter` from `render(entry)`; your own frontmatter keys are now top-level in `data` |
| `data.date` (a string) | `data.date` (a `Date`) |
| `mystPageSchema`, type `MystPageData` | `mystSchema`, type `MystEntryData` |
| `astro-myst/styles.css` | `astro-myst/base.css` (added automatically) and the optional `astro-myst/theme.css` |
| Classes `xref`, `cite`, `admonition`, `math-display`, `card`, `grid`, `tab-set`, … | `myst-xref`, `myst-cite`, `myst-admonition`, `myst-math-display`, `myst-card`, `myst-grid`, `myst-tabs`, … (see [](#ref-components)) |
| Assets in `public/_myst/<collection>` | Served from Astro's cache folder in `astro dev`, copied to `dist/_myst/<collection>` in builds |
| `.gitignore` entries for `content/_build/` and `public/_myst/` | Not needed any more |
| Multi-project MyST sites (`site.projects`) | One collection per MyST project; see [](#guide-multiple-collections) |
