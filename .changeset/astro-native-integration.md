---
'astro-myst': minor
---

**Breaking: astro-myst is now an Astro integration plus a loader, and MyST content needs no `myst.yml`.**

```ts
// astro.config.ts
import myst from 'astro-myst';
export default defineConfig({ integrations: [myst()] });

// src/content.config.ts
import { mystLoader } from 'astro-myst/loaders';
export const collections = {
  blog: defineCollection({ loader: mystLoader({ base: './src/content/blog' }) }),
};
```

- Like Astro's `glob()` loader, every matching file of a folder (default `**/[^_]*.{md,ipynb}`) becomes an entry, with the same ids. The files are compiled together by mystmd as a project that astro-myst generates in Astro's cache folder, so numbering, cross-references and citations work across them, and `.bib` files in the folder are found automatically. MyST options go in the integration's or loader's `project` option; order and nesting in the loader's `toc` option.
- Nothing is written next to your content or into `public/`: the dev server serves images and downloads from Astro's cache, and builds copy them (only the ones pages use) into the output, also for server output with adapters.
- Entry data keeps your own frontmatter keys (mystmd drops keys it does not know), so you can type them by extending `mystSchema`, including `image()`. MyST's normalized `title`, `authors`, `date` (now a `Date`), `thumbnail`, … sit next to them, and `data.myst` holds `url`, `order`, `level`, `enumerator` and `kind`. Entries also have `body` and `filePath`.
- The integration adds the stylesheets to every page: `styles: 'base'` (default; KaTeX plus only what MyST content needs to work, with zero specificity so your CSS, Tailwind and `prose` win), `'theme'` (adds an optional theme with dark mode) or `false`. Code blocks carry their own colours and follow dark mode, including Tailwind's `.dark` class.
- All classes in the rendered HTML now start with `myst-`, so the injected CSS cannot clash with your site's classes.

Migrating from 0.1:

| 0.1 | 0.2 |
| --- | --- |
| `content/myst.yml` | integration/loader `project` options, loader `toc` and `pattern` |
| `import { mystLoader } from 'astro-myst'` | `import { mystLoader } from 'astro-myst/loaders'` and `integrations: [myst()]` |
| `mystLoader({ root })` | `mystLoader({ base })` |
| `routeBase` (default `/`) | `route`, a prefix or a function (default `/<collection>`) |
| `mystArgs`, `command` | `args` (integration or loader), `command` (integration) |
| `numberedReferences`, `site.options.numbered_references` | `numberedCitations` |
| `bibliographyTitle`, `footnotesTitle` | `labels: { references, footnotes }` |
| `assetsDir`, `skipThemeDownload`, `project` (multi-project sites) | removed |
| `data.path`, `data.isIndex`, `data.source` | `entry.id` (`'index'` for the root page), `entry.filePath` |
| `data.url`, `.order`, `.level`, `.enumerator`, `.kind` | `data.myst.url`, `.order`, `.level`, `.enumerator`, `.kind` |
| `data.frontmatter` | your keys are in `data`; MyST's full frontmatter is `render(entry).remarkPluginFrontmatter` |
| `mystPageSchema` | `mystSchema` |
| `astro-myst/styles.css` | added automatically (`base.css`), optional `theme.css` |
| classes `xref`, `cite`, `admonition`, `math-display`, `card`, `grid`, `tab-set`, … | `myst-xref`, `myst-cite`, `myst-admonition`, `myst-math-display`, `myst-card`, `myst-grid`, `myst-tabs`, … |
| `content/_build/` and `public/_myst/` in `.gitignore` | not needed any more |
