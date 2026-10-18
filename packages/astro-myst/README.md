# astro-myst

[![npm](https://img.shields.io/npm/v/astro-myst?color=1f5f8b)](https://www.npmjs.com/package/astro-myst)
[![CI](https://github.com/BlackWild/astro-myst/actions/workflows/ci.yml/badge.svg)](https://github.com/BlackWild/astro-myst/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/BlackWild/astro-myst/blob/main/LICENSE)

**MyST Markdown for Astro.** An [Astro](https://astro.build) integration and content loader that compiles your content with the official [MyST](https://mystmd.org) compiler (`mystmd`), so your Astro site gets everything MyST does:

- automatic numbering of sections, figures, sub-figures, tables, equations, code listings and theorems
- cross-references that resolve **across pages** (`@fig-signal`, `{eq}`, `{numref}`, `[](#label)`), with hover previews
- citations from BibTeX or straight from DOIs (`<doi:…>`), with a bibliography on every page; footnotes
- math rendered with KaTeX at build time, admonitions, dropdowns, tabs, grids, cards, proofs, glossaries
- LaTeX documents (`.tex`) and Jupyter notebooks (`.ipynb`) as pages, with the same numbering and references, and optional execution
- exports of every page or a whole collection to PDF (LaTeX or Typst), Word, LaTeX, Markdown and JATS, served as downloads
- navigation data: the table of contents as a tree with groups, previous/next pages and breadcrumbs

No `myst.yml` needed: MyST options live in your Astro config. Entries work with `getCollection()`, `render()` and `<Content />` like Astro's own Markdown, keep your own frontmatter for your schemas, and nothing is generated next to your content or in `public/`. Layout, navigation and styling are entirely yours — the default styles only make MyST content work, and they never fight your CSS, Tailwind or `prose`. Optional: a small theme, and scripts for copy buttons on code, Mermaid diagrams and synchronized tabs. See which [MyST features are supported](https://blackwild.github.io/astro-myst/reference/myst-features).

📖 **[Documentation](https://blackwild.github.io/astro-myst/)** — [getting started](https://blackwild.github.io/astro-myst/getting-started) · [options](https://blackwild.github.io/astro-myst/reference/options) · [examples](https://github.com/BlackWild/astro-myst/tree/main/examples)

## Installation

```sh
npm install astro-myst mystmd
```

`mystmd` is the MyST compiler, a peer dependency so you choose its version (or use a `myst` from pip/conda with the `command` option). Requirements: Astro 5, 6 or 7, mystmd 1.3 or newer, and Node.js 22.12 or newer.

## Usage

Add the integration:

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

export default defineConfig({
  integrations: [myst()],
});
```

define a collection — every `.md` and `.ipynb` file in the folder becomes an entry, and the files are compiled together so they can reference each other:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  blog: defineCollection({ loader: mystLoader({ base: './src/content/blog' }) }),
};
```

and render it:

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection, render } from 'astro:content';
import XrefPreview from 'astro-myst/XrefPreview.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<article>
  <h1>{post.data.title}</h1>
  <Content />
</article>
<XrefPreview />
```

`astro dev` recompiles the collection whenever one of its files changes, and serves its images; `astro build` exports them with the site.

## Options

```ts
// astro.config.ts — settings for every MyST collection
myst({
  project: { numbering: { headings: true }, math: { '\\dd': '\\mathrm{d}' } }, // anything myst.yml's `project:` takes
  styles: 'theme', // 'base' (default: only what MyST content needs), 'theme', or false
  numberedCitations: true,
  handlers: {
    // Render MyST nodes your way; return undefined to keep the built-in output
    admonition: (node, ctx) => (node.kind === 'tip' ? ctx.h('div', { class: 'my-tip' }, ctx.renderDefault(node)) : undefined),
  },
});

// src/content.config.ts — per collection
mystLoader({
  base: './content', // the folder, like glob()
  pattern: '**/[^_]*.{md,ipynb,tex}', // which files become entries
  toc: [{ file: 'index.md' }, { file: 'theory.md', children: [{ file: 'methods.md' }] }], // order and nesting
  route: '/', // where you serve the pages (default `/<collection>`), so links between them work
  project: { bibliography: ['refs/main.bib'] }, // MyST options for this collection
});
```

See the [options reference](https://blackwild.github.io/astro-myst/reference/options) for all of them.

## What you get

| Export | Purpose |
| --- | --- |
| `astro-myst` (default export) | The integration: options, stylesheets, MyST assets in dev and in builds |
| `mystLoader(options)` from `astro-myst/loaders` | The content loader |
| `mystSchema` from `astro-myst/loaders` | Schema of entry data, to extend with your own frontmatter |
| `astro-myst/base.css`, `/theme.css`, `/katex.css` | The stylesheets (added automatically unless `styles: false`) |
| `astro-myst/XrefPreview.astro` | Hover/focus previews of cross-references and citations |
| `renderMystPage`, `compileMystProject`, … from `astro-myst/loaders` | [Lower-level API](https://blackwild.github.io/astro-myst/reference/api) |

Each entry's `data` holds your frontmatter as written (plus MyST's normalized `title`, `authors`, `date`, …) and `myst: { url, order, level, enumerator, kind }` ([entry data](https://blackwild.github.io/astro-myst/reference/entry-data)).

## How it works

For each collection, astro-myst generates a MyST project in Astro's cache folder whose table of contents points at your files where they are, and runs `myst build --site` on it. mystmd parses MyST, LaTeX and notebooks and resolves numbering, references and citations across the collection. astro-myst renders each page's AST to HTML, rewrites MyST URLs to your routes (respecting `base` and `trailingSlash`), and stores the result in Astro's content layer; the integration serves the images from the cache in dev and copies them into the build output. Builds stay offline: MyST's own web theme is never downloaded. [More](https://blackwild.github.io/astro-myst/explanation/how-it-works).

## License

MIT
