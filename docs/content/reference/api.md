---
title: JavaScript API
label: ref-api
description: The exports of astro-myst and astro-myst/loaders, including the lower-level functions for compiling and rendering MyST.
---

astro-myst has two JavaScript entry points, like Starlight's `@astrojs/starlight` and `@astrojs/starlight/loaders`:

- `astro-myst`: the integration, for `astro.config`, and the navigation helpers, for your pages. It is kept light.
- `astro-myst/loaders`: the loader and everything else, for `src/content.config.ts` and your own code.

The stylesheets (`astro-myst/base.css`, `astro-myst/theme.css`, `astro-myst/katex.css`) and the `astro-myst/XrefPreview.astro` component are described in [](#ref-components); the browser scripts in `astro-myst/client/*` [below](#ref-api-client).

## `astro-myst`

| Export | Description |
|---|---|
| `myst(options?: MystOptions): AstroIntegration` | The integration (default export). See [](#ref-options-integration). |
| `mystNavigation(entries)` | The table of contents of a collection as a tree of `MystNavItem`s. See [below](#ref-api-navigation). |
| `mystPrevNext(entries, current)` | The pages before and after `current` in toc order. See [below](#ref-api-navigation). |
| `VERSION: string` | The installed version of astro-myst |
| Types | `MystOptions`, `MystProjectOptions`, `MystLoaderOptions`, `MystTocEntry`, `MystRoute`, `MystEntryData`, `MystRenderSettings`, `MystNodeHandler`, `MystRenderContext`, `MarkdownHeading`, `MystNode`, `HastChild`, `RawNode`, `MystNavEntry`, `MystNavItem`, `MystExports`, `MystExportsOptions`, `MystExportFormat`, `MystCollectionExportFormat` |

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

export default defineConfig({ integrations: [myst()] });
```

## `astro-myst/loaders`

| Export | Description |
|---|---|
| `mystLoader(options: MystLoaderOptions)` | The content loader. See [](#ref-options-loader). |
| `mystSchema` | The Zod schema of entry data, to extend with your own frontmatter. See [](#ref-entry-data-schema). |
| `renderMystPage(page, options)` | Renders one page of mystmd's output to HTML |
| `compileMystProject(options)` | Runs mystmd on a MyST project with a `myst.yml` (low level) |
| `readMystBuild(root, logger)` | Reads the output of a previous mystmd build (low level) |
| Types | `MystLoaderOptions`, `MystTocEntry`, `MystRoute`, `MystEntryData`, `MystRenderSettings`, `RenderOptions`, `RenderResult`, `MystNodeHandler`, `MystRenderContext`, `MarkdownHeading`, `MystBuild`, `MystPageJson`, `MystCitation`, `MystNode`, `HastChild`, `RawNode` |

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  notes: defineCollection({ loader: mystLoader({ base: './src/content/notes' }) }),
};
```

## Custom renderers

`handlers` (an option of the integration and the loader) maps MyST node types to functions of the type `MystNodeHandler`:

```ts
type MystNodeHandler = (
  node: MystNode,
  ctx: MystRenderContext,
  parent?: MystNode,
) => HastChild | HastChild[] | null | undefined;
```

Return [hast](https://github.com/syntax-tree/hast) nodes to replace the built-in output, `null` to render nothing, or `undefined` to fall back to the built-in renderer. For example, to wrap tips in an extra element:

```ts
myst({
  handlers: {
    admonition: (node, ctx) =>
      node.kind === 'tip' ? ctx.h('div', { class: 'my-tip' }, ctx.renderDefault(node)) : undefined,
  },
});
```

`MystRenderContext` provides:

| Member | Description |
|---|---|
| `page` | The page being rendered (`MystPageJson`: frontmatter, references, …) |
| `all(node)` | Renders the children of `node`; custom handlers apply |
| `one(node, parent?)` | Renders `node`; custom handlers apply |
| `renderDefault(node, parent?)` | Renders `node` with the built-in renderer, bypassing custom handlers, for example to wrap its output |
| `h(tag, props?, children?)` | Builds an element, like hastscript's `h()`, accepting rendered children including raw HTML |
| `raw(html)` | Embeds a raw HTML string |
| `text(value)` | Creates a text node |
| `resolvePageUrl(mystUrl)` | Maps a MyST page URL (`/`, `/theory`) to the page's URL, or `undefined` if unknown |
| `resolveAssetUrl(url)` | Maps a MyST asset URL (`/figure-1a2b.png`) to its public URL |

`MystNode` is a node of the MyST AST: `{ type, children?, value?, … }`. See [](#guide-custom-renderers) for a walkthrough.

(ref-api-navigation)=
## Navigation helpers

```ts
function mystNavigation<E extends MystNavEntry>(entries: readonly E[]): MystNavItem<E>[];
function mystPrevNext<E extends MystNavEntry>(entries: readonly E[], current: E | string): { prev?: E; next?: E };

interface MystNavItem<E> {
  title: string; // the page's short_title or title, or the group's title
  entry?: E; // undefined for groups
  url?: string; // undefined for groups
  level: number; // 1 for the top level
  children: MystNavItem<E>[];
}
```

Both take the entries of a MyST collection, as returned by `getCollection()`, in any order and possibly filtered: they sort by `data.myst.order`. `mystNavigation()` nests pages under their parent pages and toc groups using `data.myst.parents`; a parent page that is not in `entries` becomes an item without `entry` and `url`, holding its children. `MystNavEntry` describes the fields they read, which every MyST entry has. See [](#guide-routing) for examples.

(ref-api-exports)=
## Export options

The `exports` option of the integration and the loader has the type `MystExports`:

```ts
type MystExportFormat = 'pdf' | 'typst' | 'tex' | 'docx' | 'md' | 'jats';
type MystCollectionExportFormat = 'pdf' | 'typst' | 'tex';
type MystExports = MystExportFormat[] | MystExportsOptions;

interface MystExportsOptions {
  pages?: MystExportFormat[]; // one file per page
  collection?: MystCollectionExportFormat[]; // one file of all pages, in toc order
  templates?: Partial<Record<MystExportFormat, string>>; // template name, URL or folder
  dev?: boolean; // also export in astro dev
}
```

An array is short for `{ pages: [...] }`. See [](#guide-exports).

(ref-api-client)=
## Browser scripts: `astro-myst/client/*`

| Module | What it does |
|---|---|
| `astro-myst/client/sync-tabs` | Switches tabs with the same `:sync:` key together |
| `astro-myst/client/copy-code` | Adds a copy button to code blocks |
| `astro-myst/client/mermaid` | Draws `{mermaid}` diagrams with the `mermaid` package, loaded only when a page has one |

The integration's [`scripts` option](#ref-options-scripts) normally adds them to every page. The modules have no exports: importing one runs it, and it runs again after view transitions. To load one only where you need it, turn it off in `scripts` and import it in a `<script>` of that page or layout:

```astro
<script>
  import 'astro-myst/client/mermaid';
</script>
```

## `renderMystPage(page, options)`

```ts
function renderMystPage(page: MystPageJson, options: RenderOptions): Promise<RenderResult>;
```

Renders one page, as written by `myst build --site`, and returns `{ html, headings, parts }`. The loader uses it for every entry; call it yourself for a custom loader, a script or a test.

```ts
import { compileMystProject, renderMystPage } from 'astro-myst/loaders';

const build = await compileMystProject({ root: '/absolute/path/to/project', logger: console });
const { html, headings } = await renderMystPage(build.pages.get('theory')!, {
  resolvePageUrl: (mystUrl) => `/docs${mystUrl === '/' ? '' : mystUrl}`,
  resolveAssetUrl: (url) => `/docs/assets${url}`, // after copying build.publicDir there
});
```

| Option | Description |
|---|---|
| `resolvePageUrl(mystUrl)` | Required. Maps a MyST page URL (`/`, `/theory`) to your URL; return `undefined` for unknown pages |
| `resolveAssetUrl(url)` | Required. Maps an asset URL (`/figure-1a2b.png`) to its public URL |
| `readAsset(url)` | Returns the text of a file written by mystmd (large notebook outputs are stored as files), or `undefined` |
| `codeThemes`, `handlers`, `numberedCitations`, `labels` | The [render settings](#ref-options-render) |

`headings` is a list of `MarkdownHeading`: `{ depth, slug, text }`. `parts` maps the name of each part given in the page's frontmatter (`abstract`, `acknowledgments`, …) to its HTML, which `html` contains too.

## Low-level: compiling a MyST project

The loader generates a MyST project for each collection and compiles it. To compile a MyST project of your own, with its own `myst.yml`, use these functions directly.

### `compileMystProject(options)`

```ts
function compileMystProject(options: {
  root: string;
  logger: { info; warn; error; debug };
  resolveFrom?: string;
  command?: string;
  args?: string[];
  skipThemeDownload?: boolean;
}): Promise<MystBuild>;
```

Runs `myst build --site` in `root` and reads the result.

| Option | Description |
|---|---|
| `root` | Absolute path of the folder with `myst.yml`. It needs a `site:` section (`site: {}` is enough). |
| `logger` | Receives mystmd's output: lines starting with `⚠️` as warnings, `⛔` or `error` as errors, everything else as debug messages. `console` works. |
| `resolveFrom` | Folder from which the `mystmd` package is resolved first. Default: `root` |
| `command` | Executable to run instead of the `mystmd` package, as the integration's [`command`](#ref-options-integration) |
| `args` | Extra flags for `myst build --site` |
| `skipThemeDownload` | `myst build --site` downloads MyST's web theme, which an Astro site does not need. By default a stub theme is placed in `_build/templates` for the duration of the build, so nothing is downloaded. Set `false` to let mystmd download it. |

`_build/site` is emptied before every build, and builds of the same `root` run one after the other.

### `readMystBuild(root, logger)`

```ts
function readMystBuild(root: string, logger: { info; warn; error; debug }, label?: string): MystBuild;
```

Reads the output of a previous build from `<root>/_build/site` without compiling. `label` names the compiler in messages.

### `MystBuild`

| Field | Description |
|---|---|
| `pages` | `Map` of page slug to page JSON (`MystPageJson`); keys are `<project>/<slug>` for multi-project sites |
| `config` | The site manifest (`_build/site/config.json`), with the table of contents |
| `publicDir` | Folder with the images and downloads the pages reference |
| `xref` | The cross-reference inventory (`myst.xref.json`), when mystmd wrote one |

A `MystPageJson` has the page's `slug`, `kind`, `location` (source file), `frontmatter`, `mdast` (the resolved AST) and `references` (citations).
