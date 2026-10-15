# astro-myst

[![npm](https://img.shields.io/npm/v/astro-myst?color=1f5f8b)](https://www.npmjs.com/package/astro-myst)
[![CI](https://github.com/BlackWild/astro-myst/actions/workflows/ci.yml/badge.svg)](https://github.com/BlackWild/astro-myst/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/BlackWild/astro-myst/blob/main/LICENSE)

**MyST Markdown for Astro.** An [Astro](https://astro.build) content loader that compiles your content with the official [MyST](https://mystmd.org) compiler (`mystmd`), so your Astro site gets everything MyST does:

- automatic numbering of sections, figures, sub-figures, tables, equations, code listings and theorems
- cross-references that resolve **across pages** (`@fig-signal`, `{eq}`, `{numref}`, `[](#label)`), with hover previews
- citations from BibTeX or straight from DOIs (`<doi:…>`), with a bibliography on every page; footnotes
- math rendered with KaTeX at build time, admonitions, dropdowns, tabs, grids, cards, proofs, glossaries
- LaTeX documents (`.tex`) and Jupyter notebooks (`.ipynb`) as pages, with the same numbering and references

Entries work with `getCollection()`, `render()` and `<Content />` like any other Astro content; the layout, navigation and styling are entirely yours.

📖 **[Documentation](https://blackwild.github.io/astro-myst/)** — [getting started](https://blackwild.github.io/astro-myst/getting-started) · [loader options](https://blackwild.github.io/astro-myst/reference/loader-options) · [examples](https://github.com/BlackWild/astro-myst/tree/main/examples)

## Installation

```sh
npm install astro-myst mystmd
```

`mystmd` is the MyST compiler, a peer dependency so you choose its version. Requirements: Astro 5, 6 or 7, mystmd 1.3 or newer, and Node.js 22.12 or newer.

## Usage

Put a MyST project in your Astro repository — for example `content/` with a `myst.yml` (create one with `npx myst init`; it needs a `site:` section, and `site: {}` is enough). Then define a collection:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst';

export const collections = {
  docs: defineCollection({ loader: mystLoader({ root: './content' }) }),
};
```

and render it:

```astro
---
// src/pages/[...slug].astro
import { getCollection, render } from 'astro:content';
import XrefPreview from 'astro-myst/XrefPreview.astro';
import 'astro-myst/katex.css';
import 'astro-myst/styles.css';

export async function getStaticPaths() {
  const pages = await getCollection('docs');
  return pages.map((page) => ({ params: { slug: page.data.path || undefined }, props: { page } }));
}

const { page } = Astro.props;
const { Content } = await render(page);
---

<article class="myst">
  <h1>{page.data.title}</h1>
  <Content />
</article>
<XrefPreview />
```

Add `content/_build/` and `public/_myst/` to `.gitignore`. `astro dev` recompiles the project whenever a file in it changes.

## What you get

| Export | Purpose |
| --- | --- |
| `mystLoader(options)` | Content loader; see the [options](https://blackwild.github.io/astro-myst/reference/loader-options) |
| `astro-myst/styles.css` | Default styles for MyST content inside `.myst`, themable with CSS custom properties |
| `astro-myst/katex.css` | KaTeX styles for the math HTML that mystmd pre-renders |
| `astro-myst/XrefPreview.astro` | Hover/focus previews of cross-references and citations |
| `compileMystProject`, `renderMystPage`, … | [Lower-level API](https://blackwild.github.io/astro-myst/reference/api) |

Each entry's `data` holds the title, authors, URL, route path, position in the MyST table of contents and the full frontmatter ([entry data](https://blackwild.github.io/astro-myst/reference/entry-data)).

## How it works

The loader runs `myst build --site`, which parses MyST, LaTeX and notebooks and resolves numbering, references and citations across the whole project. astro-myst then renders each page's AST to HTML, rewrites MyST URLs to your routes (respecting `base` and `trailingSlash`), copies images to `public/`, and stores the result in Astro's content layer. Builds stay offline: MyST's own web theme is never downloaded. [More](https://blackwild.github.io/astro-myst/explanation/how-it-works).

## License

MIT
