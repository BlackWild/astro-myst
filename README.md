<div align="center">

# astro-myst

**MyST Markdown for Astro** — numbered figures, equations and sections, cross-references across pages,
citations, math, LaTeX sources and Jupyter notebooks, compiled by the official [mystmd](https://mystmd.org) engine.

[![npm](https://img.shields.io/npm/v/astro-myst?color=1f5f8b)](https://www.npmjs.com/package/astro-myst)
[![CI](https://github.com/BlackWild/astro-myst/actions/workflows/ci.yml/badge.svg)](https://github.com/BlackWild/astro-myst/actions/workflows/ci.yml)
[![Docs](https://github.com/BlackWild/astro-myst/actions/workflows/docs.yml/badge.svg)](https://blackwild.github.io/astro-myst/)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/BlackWild/astro-myst/badge)](https://scorecard.dev/viewer/?uri=github.com/BlackWild/astro-myst)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[**Documentation**](https://blackwild.github.io/astro-myst/) ·
[Getting started](https://blackwild.github.io/astro-myst/getting-started) ·
[Examples](./examples) ·
[Changelog](./packages/astro-myst/CHANGELOG.md)

</div>

![A page rendered by astro-myst: numbered sections, an equation, sub-figures and a code listing](.github/assets/screenshot-figures.png)

## Why

Astro renders Markdown one file at a time, so it cannot number a figure in one file and reference it from another. [MyST](https://mystmd.org) — the toolchain behind Jupyter Book — is built for exactly that. **astro-myst** is an Astro integration and content loader that compiles a folder of MyST files with the official compiler and turns every file into a content collection entry, with everything resolved:

- automatic numbering of sections, figures, sub-figures, tables, equations, code listings and theorems
- cross-references that work **across pages**, with hover previews
- citations from BibTeX or bare DOIs, with a bibliography on every page
- KaTeX math rendered at build time, admonitions, tabs, cards, grids, proofs, footnotes, glossaries
- **LaTeX** (`.tex`) and **Jupyter notebook** (`.ipynb`) pages next to Markdown ones, with optional execution
- **exports** of every page or a whole collection to PDF (LaTeX or Typst), Word, LaTeX, Markdown and JATS, served as downloads
- navigation data: the table of contents as a tree with groups, previous/next pages and breadcrumbs

It fits into Astro like its own Markdown support: **no `myst.yml`** (MyST options go in your Astro config), your own frontmatter and schemas, entries that work with `getCollection()`, `render()` and `<Content />`, images served by the dev server and exported with the build — nothing is generated next to your content or in `public/`. The default styles only make MyST content work and never fight your CSS, so it pairs well with Tailwind and `prose` for blogs, and an optional theme is one option away; so are small scripts for copy buttons on code, Mermaid diagrams and synchronized tabs. The [feature list](https://blackwild.github.io/astro-myst/reference/myst-features) tracks which MyST features are supported.

## Quick start

```sh
npm install astro-myst mystmd
```

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

export default defineConfig({
  integrations: [myst()],
});
```

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  blog: defineCollection({ loader: mystLoader({ base: './src/content/blog' }) }),
};
```

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection, render } from 'astro:content';

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
```

Every `.md` and `.ipynb` file in `src/content/blog` becomes an entry; the files are compiled together, so they can reference each other's figures and equations. Follow the [getting started guide](https://blackwild.github.io/astro-myst/getting-started) for the details, and the [options reference](https://blackwild.github.io/astro-myst/reference/options) for numbering, citations, tables of contents and styles.

## Examples

| Example | Shows |
| --- | --- |
| [`examples/minimal`](./examples/minimal) | The smallest setup: two pages that reference each other |
| [`examples/book`](./examples/book) | A book with chapter numbering, sidebar, outline, sub-figures, theorems, a LaTeX chapter, a notebook and citations |
| [`examples/paper`](./examples/paper) | A LaTeX article with a Markdown supplement numbered S1, S2, … |

The [documentation site](https://blackwild.github.io/astro-myst/) is itself written in MyST and rendered with astro-myst.

## Repository

| Path | Contents |
| --- | --- |
| [`packages/astro-myst`](./packages/astro-myst) | The npm package |
| [`docs`](./docs) | Documentation site |
| [`examples`](./examples) | Example sites |
| [`e2e`](./e2e) | End-to-end tests (Playwright) |

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). Please report security issues privately as described in [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © Siavash Davani. MyST and mystmd are developed by the [Jupyter Book / Executable Books](https://github.com/jupyter-book) community.
