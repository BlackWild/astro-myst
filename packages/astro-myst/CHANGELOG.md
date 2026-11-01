# Changelog

## 0.3.1

### Patch Changes

- [#21](https://github.com/BlackWild/astro-myst/pull/21) [`939dafa`](https://github.com/BlackWild/astro-myst/commit/939dafa2c55b41811d69eac935e9a64d7c95f007) Thanks [@BlackWild](https://github.com/BlackWild)! - Accept Mermaid 12 for the optional Mermaid script (`scripts: { mermaid: true }`), next to Mermaid 10 and 11.

## 0.3.0

### Minor Changes

- [#10](https://github.com/BlackWild/astro-myst/pull/10) [`81d78ea`](https://github.com/BlackWild/astro-myst/commit/81d78ea1139a4376d32d237eb66cbd108da46324) Thanks [@BlackWild](https://github.com/BlackWild)! - **Exports, navigation helpers, optional browser scripts, and more of MyST rendered.**

  - **Exports**: the new `exports` option (integration and loader) has mystmd export every page, or a whole collection, to PDF (LaTeX or Typst), Word, LaTeX sources, Markdown or JATS XML during `astro build` (in `astro dev` too with `dev: true`). The files are served like images and listed in `data.myst.exports` for download links: `exports: ['pdf', 'docx']` or `{ pages, collection, templates, dev }`. Exports declared in a page's frontmatter are built when their format is enabled; an `output` path in them, which would write next to your content, is refused.
  - **Navigation**: `data.myst.parents` lists the toc groups and parent pages of each entry, and `mystNavigation(entries)` and `mystPrevNext(entries, current)` (from `astro-myst`) build a sidebar tree with group titles and previous/next links.
  - **Browser scripts** (`scripts` option): tabs with the same `:sync:` key switch together (`syncTabs`, on by default), copy buttons on code blocks (`copyCode`), and Mermaid diagrams drawn in the browser (`mermaid`; install `mermaid`).
  - Frontmatter parts such as `abstract:` are now rendered (the abstract before the content, other parts after it) and available as HTML in `data.myst.parts`.
  - Frontmatter `downloads` are served and listed in `data.myst.downloads`.
  - `{bibliography}` places the references where it stands; without it they still follow the page.
  - `{si}` typesets compound units like siunitx (`9.81 m s⁻²` instead of mystmd's `9.81 mperssquared`); `{chem}` renders numbers as subscripts (`span.myst-chem`), `{eval}` results are `span.myst-eval`, `{toc}` renders as `nav.myst-toc` instead of a part with a "Toc:…" heading, and `{button}` keeps its `button` class on cross-references (plus `myst-button`, styled by the optional theme).
  - The optional theme can hang margin notes in the page margin on wide screens (`myst-margin-column` class next to `myst`).

## 0.2.0

### Minor Changes

- [#8](https://github.com/BlackWild/astro-myst/pull/8) [`5ee6563`](https://github.com/BlackWild/astro-myst/commit/5ee6563dec6c8b7be40406ed651188d9d2d27000) Thanks [@BlackWild](https://github.com/BlackWild)! - **Breaking: astro-myst is now an Astro integration plus a loader, and MyST content needs no `myst.yml`.**

  ```ts
  // astro.config.ts
  import myst from "astro-myst";
  export default defineConfig({ integrations: [myst()] });

  // src/content.config.ts
  import { mystLoader } from "astro-myst/loaders";
  export const collections = {
    blog: defineCollection({
      loader: mystLoader({ base: "./src/content/blog" }),
    }),
  };
  ```

  - Like Astro's `glob()` loader, every matching file of a folder (default `**/[^_]*.{md,ipynb}`) becomes an entry, with the same ids. The files are compiled together by mystmd as a project that astro-myst generates in Astro's cache folder, so numbering, cross-references and citations work across them, and `.bib` files in the folder are found automatically. MyST options go in the integration's or loader's `project` option; order and nesting in the loader's `toc` option.
  - Nothing is written next to your content or into `public/`: the dev server serves images and downloads from Astro's cache, and builds copy them (only the ones pages use) into the output, also for server output with adapters.
  - Entry data keeps your own frontmatter keys (mystmd drops keys it does not know), so you can type them by extending `mystSchema`, including `image()`. MyST's normalized `title`, `authors`, `date` (now a `Date`), `thumbnail`, … sit next to them, and `data.myst` holds `url`, `order`, `level`, `enumerator` and `kind`. Entries also have `body` and `filePath`.
  - The integration adds the stylesheets to every page: `styles: 'base'` (default; KaTeX plus only what MyST content needs to work, with zero specificity so your CSS, Tailwind and `prose` win), `'theme'` (adds an optional theme with dark mode) or `false`. The rules sit in the cascade layer `components`, between Tailwind 4's preflight and its utilities, whichever stylesheet loads first. Code blocks carry their own colours and follow dark mode, including Tailwind's `.dark` class.
  - `args: ['--execute']` runs notebooks and Markdown notebooks wherever the collection lives (mystmd's Jupyter server only accepts files inside its project folder, which the generated project now links to).
  - All classes in the rendered HTML now start with `myst-`, so the injected CSS cannot clash with your site's classes.

  Migrating from 0.1:

  | 0.1                                                                                | 0.2                                                                                                        |
  | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
  | `content/myst.yml`                                                                 | integration/loader `project` options, loader `toc` and `pattern`                                           |
  | `import { mystLoader } from 'astro-myst'`                                          | `import { mystLoader } from 'astro-myst/loaders'` and `integrations: [myst()]`                             |
  | `mystLoader({ root })`                                                             | `mystLoader({ base })`                                                                                     |
  | `routeBase` (default `/`)                                                          | `route`, a prefix or a function (default `/<collection>`)                                                  |
  | `mystArgs`, `command`                                                              | `args` (integration or loader), `command` (integration)                                                    |
  | `numberedReferences`, `site.options.numbered_references`                           | `numberedCitations`                                                                                        |
  | `bibliographyTitle`, `footnotesTitle`                                              | `labels: { references, footnotes }`                                                                        |
  | `assetsDir`, `skipThemeDownload`, `project` (multi-project sites)                  | removed                                                                                                    |
  | `data.path`, `data.isIndex`, `data.source`                                         | `entry.id` (`'index'` for the root page), `entry.filePath`                                                 |
  | `data.url`, `.order`, `.level`, `.enumerator`, `.kind`                             | `data.myst.url`, `.order`, `.level`, `.enumerator`, `.kind`                                                |
  | `data.frontmatter`                                                                 | your keys are in `data`; MyST's full frontmatter is `render(entry).remarkPluginFrontmatter`                |
  | `mystPageSchema`                                                                   | `mystSchema`                                                                                               |
  | `astro-myst/styles.css`                                                            | added automatically (`base.css`), optional `theme.css`                                                     |
  | classes `xref`, `cite`, `admonition`, `math-display`, `card`, `grid`, `tab-set`, … | `myst-xref`, `myst-cite`, `myst-admonition`, `myst-math-display`, `myst-card`, `myst-grid`, `myst-tabs`, … |
  | `content/_build/` and `public/_myst/` in `.gitignore`                              | not needed any more                                                                                        |

## 0.1.2

### Patch Changes

- [#6](https://github.com/BlackWild/astro-myst/pull/6) [`9fa1108`](https://github.com/BlackWild/astro-myst/commit/9fa110804b9897f44f5433b974a791cf790d353f) Thanks [@BlackWild](https://github.com/BlackWild)! - Images now get both `width` and `height` as CSS, as in MyST's own theme: `:height: 40%` was written as the HTML attribute `height="40%"`, which browsers read as 40 pixels, and heights had no effect inside figures. `.mp4` files in `{image}`, `{figure}` and `![](...)` render as looping, muted `<video>` elements instead of broken images.

- [#6](https://github.com/BlackWild/astro-myst/pull/6) [`4e56ad5`](https://github.com/BlackWild/astro-myst/commit/4e56ad5fb5dd8a410d26169d5e5d45d64cb245d9) Thanks [@BlackWild](https://github.com/BlackWild)! - Repeated references to the same footnote get unique ids (`fnref-n`, `fnref-n-2`, …) instead of duplicate ones; the footnote's back-link still points to the first reference.

## 0.1.1

### Patch Changes

- [#4](https://github.com/BlackWild/astro-myst/pull/4) [`2603e38`](https://github.com/BlackWild/astro-myst/commit/2603e38964460507b92695937792dcf8efc7369c) Thanks [@BlackWild](https://github.com/BlackWild)! - First release published from GitHub Actions with provenance.

## 0.1.0 — 2026-10-14

Initial release.

- `mystLoader()`: Astro content loader that compiles a MyST project with `mystmd` (`myst build --site`) and stores rendered HTML, headings and typed page data per MyST page.
- Full MyST semantics from mystmd: numbering, cross-page references, citations, footnotes, KaTeX math with macros, proofs, admonitions, tabs, grids, cards, notebooks with outputs.
- URL rewriting that respects Astro `base`, `trailingSlash` and a configurable `routeBase`; assets copied to `public/<assetsDir>`.
- Offline builds (no download of MyST's React theme), build caching keyed on the MyST sources, live recompilation in `astro dev`.
- Custom node `handlers`, Shiki code highlighting, default stylesheet, KaTeX stylesheet, and the `XrefPreview` component for hover previews.
- Notebook cell visibility tags, large outputs stored as files, and the output format of mystmd < 1.7.
- Multi-project MyST sites (`project` option), `extraInputs` for files outside the project, references into external MyST sites.
- LaTeX (`.tex`) pages: document parts such as `\begin{abstract}` render as sections, and KaTeX's own line numbers are hidden so `align` blocks show MyST's single number.
- Numbered citations (`[1]`) via myst.yml `site.options.numbered_references` or the `numberedReferences` option.
- DOI citations: bibliography ids are derived safely from doi.org labels (`cite-doi-10.5281-zenodo.6476040`); `myst.doi.bib` written by `--doi-bib` is not treated as a source (no rebuild loop in dev).
- Empty frontmatter strings (e.g. a title made only of an unsupported macro) are treated as missing.
- Lower-level `compileMystProject()`, `readMystBuild()` and `renderMystPage()` APIs.
