# astro-myst

**MyST Markdown for Astro.** An [Astro](https://astro.build) content loader that compiles your content with the official [MyST](https://mystmd.org) compiler (`mystmd`), so your Astro site gets everything MyST does:

- automatic numbering of sections, figures, sub-figures, tables, equations, code listings, theorems, …
- cross-references that resolve **across pages** (`@fig-signal`, `{eq}`, `{numref}`, `[](#label)`)
- citations from BibTeX or straight from DOIs (`<doi:…>`, fetched from doi.org), with a per-page bibliography; footnotes
- math (KaTeX, with project-wide macros), admonitions, dropdowns, tabs, grids, cards, proofs/theorems, exercises
- LaTeX documents (`.tex`) as pages, with the same numbering and cross-references ([details](#latex-sources))
- Jupyter notebooks (`.ipynb`) with their outputs and cell tags (`remove-input`, `hide-output`, …), `{include}`, `{embed}`, glossaries, abbreviations, …
- hover previews of referenced content, like the MyST book theme

Your pages stay ordinary Astro content entries: `getCollection()`, `render(entry)`, `<Content />` and `headings` work as with Markdown, and the layout, navigation and styling are entirely yours.

```
myst.yml + *.md / *.ipynb ──► mystmd (myst build --site) ──► resolved AST per page
                                                                  │
                                    astro-myst: AST → HTML, URL rewriting, assets
                                                                  ▼
                               Astro content collection ──► render(entry) / <Content />
```

## Installation

```sh
npm install astro-myst mystmd
```

`mystmd` is the MyST compiler (a Node CLI). If you already have `myst` from pip/conda, or use Jupyter Book 2, you can skip it and set the [`command`](#options) option instead.

Requirements: Astro 5, 6 or 7, mystmd 1.3 or newer (tested with 1.3, 1.6, 1.8 and 1.11), and the Node version your Astro release requires.

## Quick start

1. Put a MyST project in your Astro repo, e.g. `content/` with a `myst.yml` (create one with `npx myst init`). It needs a `site:` section; `site: {}` is enough.

   ```yaml
   # content/myst.yml
   version: 1
   project:
     title: My Book
     numbering:
       headings: true
     toc:
       - file: index.md
       - file: theory.md
   site: {}
   ```

2. Define a collection with the loader:

   ```ts
   // src/content.config.ts
   import { defineCollection } from 'astro:content';
   import { mystLoader } from 'astro-myst';

   export const collections = {
     book: defineCollection({ loader: mystLoader({ root: './content' }) }),
   };
   ```

3. Render the pages:

   ```astro
   ---
   // src/pages/[...slug].astro
   import { getCollection, render } from 'astro:content';
   import XrefPreview from 'astro-myst/XrefPreview.astro';
   import 'astro-myst/katex.css';
   import 'astro-myst/styles.css';

   export async function getStaticPaths() {
     const pages = await getCollection('book');
     return pages.map((page) => ({ params: { slug: page.data.path || undefined }, props: { page } }));
   }

   const { page } = Astro.props;
   const { Content, headings } = await render(page);
   ---
   <html lang="en">
     <head><meta charset="utf-8" /><title>{page.data.title}</title></head>
     <body>
       <article class="myst">
         <h1>{page.data.enumerator} {page.data.title}</h1>
         <Content />
       </article>
       <XrefPreview />
     </body>
   </html>
   ```

4. Add the generated folders to `.gitignore`:

   ```
   content/_build/
   public/_myst/
   ```

`astro dev` recompiles the MyST project whenever a file in it changes, and numbering and references update on every page.

## LaTeX sources

`.tex` files work as pages too, because mystmd parses LaTeX into the same AST as MyST Markdown. List them in the `toc` of `myst.yml` (without an explicit `toc`, MyST turns every `.tex` file into a page, including fragments you only `\input`) and they get the same treatment: `\section` numbering, `\label`/`\ref`/`\eqref` (also to and from Markdown pages; labels with colons such as `eq:main` are fine), numbered `equation`/`align`, `figure` and `table` environments, `\newtheorem` environments, `\cite`/`\citet`/`\citep` with your `.bib`, `\footnote`, `\input`, `siunitx`, simple `\newcommand` macros, `\title`/`\author` as page metadata and `\begin{abstract}` as an abstract section. You can also `{include}` a `.tex` snippet from a Markdown page.

```yaml
project:
  toc:
    - file: index.md
    - file: paper.tex
```

The LaTeX support is mystmd's own ([supported packages and macros](https://mystmd.org/guide/writing-in-latex)), so its limits apply: it is not a full TeX engine, unsupported macros are dropped (mystmd reports each one with file, line and column, and astro-myst shows these in the Astro log), an `align` block gets a single equation number (for its first `\label`), and optional theorem titles such as `\begin{theorem}[Name]` are not carried over.

## Citations and DOIs

Everything MyST supports for citations works, because mystmd resolves them before astro-myst renders the page: BibTeX keys (`{cite:p}\`key\``, `[@key]`, `@key`) and DOIs written as `<doi:10.5281/zenodo.6476040>`, `[](doi:…)`, `https://doi.org/…` links, `{cite:t}\`10.…\`` or `[@10.…]`. A DOI that matches an entry in your `.bib` files uses that entry; any other DOI is downloaded from doi.org during the build. Each page gets a bibliography of what it cites, and the citation links point to it (and get hover previews with `XrefPreview`).

- Downloads are cached in `<root>/_build/cache`, so only the first build fetches them. A clean checkout (e.g. CI) fetches again; to avoid that, run `npx myst build --doi-bib` once in the MyST project and commit the generated `myst.doi.bib` (add it to `bibliography:` if you list files there explicitly).
- A DOI that cannot be resolved (offline, typo, doi.org down) is reported in the Astro log with file and line, and stays a plain doi.org link; the build continues unless you pass `mystArgs: ['--strict']`.
- Numbered citations (`[1]`, `[2, 3]`) instead of author–year: set `site.options.numbered_references: true` in myst.yml, or the loader option `numberedReferences: true`.

## Options

```ts
mystLoader({
  root: './content',          // folder with myst.yml (relative to the Astro root) — required
  routeBase: '/',             // where you mount the pages, e.g. '/book/' for src/pages/book/[...slug].astro
  assetsDir: '_myst/<collection>', // public/ sub-folder for images, notebook outputs and downloads
  command: undefined,         // e.g. 'myst' (pip/conda) or 'jupyter-book'; default: the mystmd npm package
  mystArgs: [],               // extra flags for `myst build --site`, e.g. ['--execute'], ['--strict']
  skipThemeDownload: true,    // never download MyST's React theme (not needed; keeps builds offline)
  cache: true,                // reuse the last mystmd build if no file in `root` changed
  codeThemes: { light: 'github-light', dark: 'github-dark' }, // Shiki themes, or false
  handlers: {},               // custom renderers per MyST node type (see below)
  bibliographyTitle: 'References',
  footnotesTitle: 'Footnotes',
  numberedReferences: false,  // [1]-style citations; default from myst.yml site.options.numbered_references
  extraInputs: [],            // files/folders outside `root` the project reads (e.g. `{include} ../README.md`)
  project: undefined,         // multi-project sites (`site.projects`): slug of the project to load
});
```

Keep the MyST project in its own folder (e.g. `content/`): with `root: '.'` every change anywhere in your Astro project triggers a MyST rebuild in dev.

Links are generated from Astro's `base` and `trailingSlash` settings plus `routeBase`, so they always match your routes.

## Entry data

Each MyST page becomes one entry (`id` = MyST slug) with:

| field | description |
| --- | --- |
| `title`, `subtitle`, `short_title`, `description`, `date`, `tags`, `keywords` | from the page frontmatter (inheriting project frontmatter, as in MyST) |
| `authors` | `{ name, affiliations: string[], orcid, email, … }[]` |
| `enumerator` | page number when `numbering.title` is enabled, e.g. `"2.1"` |
| `path` | route path relative to `routeBase` (`""` for the index) — use it as the `[...slug]` param |
| `url` | full URL of the page (includes `base`) |
| `order`, `level` | position and depth in the MyST table of contents — sort by `order` for navigation |
| `isIndex`, `kind` (`"Article"`/`"Notebook"`), `source`, `projectTitle`, `thumbnail` | |
| `frontmatter` | the complete MyST frontmatter (numbering, math macros, exports, license, …) |

`render(entry)` returns `headings` with MyST's ids and numbers (`{ depth, slug, text: "2.1 Methods" }`) for a table of contents.

A typical navigation:

```astro
---
const nav = (await getCollection('book')).sort((a, b) => a.data.order - b.data.order);
---
<ul>{nav.map((p) => <li style={`margin-left:${p.data.level - 1}rem`}><a href={p.data.url}>{p.data.enumerator} {p.data.short_title ?? p.data.title}</a></li>)}</ul>
```

## Styling

- `astro-myst/styles.css` — default styles for everything the renderer emits (equation numbers, figures, admonitions, proofs, tabs, citations, previews). Content must sit inside an element with class `myst`. Colours are CSS custom properties (`--myst-accent`, `--myst-border`, …) with a dark-mode variant; override them or skip the file and write your own.
- `astro-myst/katex.css` — KaTeX styles matching the math HTML pre-rendered by mystmd. Required for math.
- `astro-myst/XrefPreview.astro` — optional component for hover/focus previews of cross-references and citations (works across pages; disabled on touch screens; `Esc` closes).

Code blocks are highlighted with [Shiki](https://shiki.style) using CSS variables for light and dark themes.

## Custom node renderers

MyST plugins can add new node types, and you may want different HTML for built-in ones. Pass `handlers`:

```ts
import { mystLoader, type MystNodeHandler } from 'astro-myst';

const admonition: MystNodeHandler = (node, ctx) => {
  if (node.kind !== 'tip') return undefined; // undefined → use the built-in renderer
  return ctx.h('div', { class: 'my-tip' }, ctx.renderDefault(node));
};

mystLoader({
  root: './content',
  handlers: {
    admonition,
    myWidget: (node, ctx) => ctx.h('my-widget', { data: JSON.stringify(node.data) }),
  },
});
```

The context gives you `all(node)`, `one(node)`, `renderDefault(node)`, `h(tag, props, children)` (like [hastscript](https://github.com/syntax-tree/hastscript), and it accepts rendered children), `raw(html)`, `text(value)`, `resolvePageUrl()`, `resolveAssetUrl()` and the `page` JSON. Handlers receive nodes exactly as mystmd wrote them; inspect `<root>/_build/site/content/*.json` to see their shape.

## Lower-level API

```ts
import { compileMystProject, readMystBuild, renderMystPage } from 'astro-myst';

const build = await compileMystProject({ root: '/abs/path/to/content', logger: console });
const page = build.pages.get('theory')!;
const { html, headings } = await renderMystPage(page, {
  resolvePageUrl: (mystUrl) => `/docs${mystUrl}`,
  resolveAssetUrl: (url) => `/docs/_myst${url}`,
});
```

## How it works

1. `myst build --site` runs in the MyST project. It parses MyST, runs all transforms (directives, roles, includes, notebooks, citations, KaTeX) and resolves numbering and references across the whole project. Its output is one JSON AST per page in `_build/site/content`, plus a site manifest with the table of contents.
2. The loader converts each AST to HTML, rewrites MyST URLs (`/theory#eq-1`) to your Astro routes, copies images and downloads to `public/<assetsDir>`, and stores the HTML in Astro's data store, so `render()` works without any Markdown processing in Astro.
3. Without MyST's React theme, `myst build --site` would download it on every clean build. The loader places a temporary stub template in `_build/templates` (removed afterwards; a real downloaded theme is never touched), so builds stay offline.

## Troubleshooting

- **"has no `site:` section"**: add `site: {}` to `myst.yml`.
- **"Could not run myst"**: install `mystmd` (`npm i -D mystmd`) or set `command`.
- **Math looks unstyled**: import `astro-myst/katex.css`.
- **Numbers restart on every page**: that is MyST's default. Use `numbering.title: true` for chapter-style numbers (2.1, 2.2…) or `numbering.<kind>.continue: true` for continuous numbering. See [MyST numbering](https://mystmd.org/guide/cross-references#numbering).
- **Warnings** from mystmd (broken references, missing citations) are shown in the Astro log; add `mystArgs: ['--strict']` to fail the build on errors.

## Limitations

- One MyST project per collection. For multi-project sites (`site.projects`), create one collection per project with the `project` option.
- Files outside `root` that MyST reads are only watched and part of the cache key when listed in `extraInputs`.
- Interactive features of the MyST React theme (live Jupyter kernels via Thebe, interactive widgets) are not reproduced; their nodes render as static content.
- `mermaid` blocks are emitted as `<pre class="mermaid">`; add the Mermaid script to your layout to draw them.

## License

MIT
