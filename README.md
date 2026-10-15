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

Astro renders Markdown one file at a time, so it cannot number a figure in one file and reference it from another. [MyST](https://mystmd.org) — the toolchain behind Jupyter Book — is built for exactly that. **astro-myst** is an Astro content loader that runs the MyST compiler on your project and turns every page into a content collection entry, with everything resolved:

- automatic numbering of sections, figures, sub-figures, tables, equations, code listings and theorems
- cross-references that work **across pages**, with hover previews
- citations from BibTeX or bare DOIs, with a bibliography on every page
- KaTeX math rendered at build time, admonitions, tabs, cards, grids, proofs, footnotes, glossaries
- **LaTeX** (`.tex`) and **Jupyter notebook** (`.ipynb`) pages next to Markdown ones

Your layout, routing and styling stay entirely yours: entries work with `getCollection()`, `render()` and `<Content />` like any other Astro content.

## Quick start

```sh
npm install astro-myst mystmd
```

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst';

export const collections = {
  docs: defineCollection({ loader: mystLoader({ root: './content' }) }),
};
```

```astro
---
// src/pages/[...slug].astro
import { getCollection, render } from 'astro:content';
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
```

`content/` is a regular MyST project with a `myst.yml` (it needs a `site:` section; `site: {}` is enough). Follow the [getting started guide](https://blackwild.github.io/astro-myst/getting-started) for the details.

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
