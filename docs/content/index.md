---
title: astro-myst
label: astro-myst-home
short_title: Overview
subtitle: MyST Markdown for Astro, compiled by the official mystmd engine
description: An Astro integration and content loader for MyST Markdown, LaTeX and Jupyter notebooks, with automatic numbering, cross-references, citations and math.
---

**astro-myst** is an [Astro](https://astro.build) integration and content loader for [MyST](https://mystmd.org), the Markedly Structured Text toolchain behind Jupyter Book. Point a content collection at a folder of MyST files and every file becomes an entry, compiled by the official `mystmd` engine: numbered sections, figures, tables and equations, cross-references between pages, citations, math, LaTeX sources and notebooks all arrive resolved. Your layout, routing and styling stay yours.

```{figure} images/pipeline.svg
:label: fig-pipeline
:alt: MyST sources are compiled by mystmd, rendered to HTML by astro-myst and served by Astro.
How a page gets from a MyST source file to your Astro site.
```

## Why

Astro's Markdown pipeline renders one file at a time, so it cannot number a figure in one file and reference it from another. MyST is built for exactly that, and `mystmd` resolves numbering, references and citations across a whole collection of files [@mystmd]. astro-myst runs that compiler and hands the result to Astro, as shown in @fig-pipeline. This site is itself an example: it is written in MyST and rendered by astro-myst.

::::{grid} 1 1 2 2

:::{card} Numbering and cross-references
Sections, figures, sub-figures, tables, equations, code listings and theorems are numbered automatically, and `@label` references resolve across pages.
:::

:::{card} Citations
BibTeX keys and bare DOIs (`<doi:10.…>`) become citations with a bibliography on every page.
:::

:::{card} LaTeX and notebooks
`.tex` files and Jupyter notebooks are pages like any other, with the same numbering and references.
:::

:::{card} No myst.yml
MyST options go in your Astro config. Nothing is generated next to your content or in `public/`.
:::

:::{card} Astro-native
Entries work with `getCollection()`, `render()` and `<Content />`, keep your own frontmatter for your schema, and links follow your routes, `base` and `trailingSlash`.
:::

:::{card} Your styles
The default styles only make MyST content work and never win against your CSS, so Tailwind and `prose` just work. An optional theme is one option away.
:::

::::

## Quick example

Install astro-myst and the MyST compiler:

```sh
npm install astro-myst mystmd
```

Then add the integration, a collection and a route. There is no `myst.yml`:

::::{tab-set}

:::{tab-item} astro.config.ts
```ts
import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

export default defineConfig({
  integrations: [myst()],
});
```
:::

:::{tab-item} src/content.config.ts
```ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  blog: defineCollection({ loader: mystLoader({ base: './src/content/blog' }) }),
};
```
:::

:::{tab-item} src/pages/blog/[...slug].astro
```astro
---
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.id === 'index' ? undefined : post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<article>
  <h1>{post.data.title}</h1>
  <Content />
</article>
```
:::

::::

Every Markdown file and notebook in `src/content/blog` becomes an entry. The files are compiled together, so a post can reference another post's figures and equations.

The same setup scales from a blog to a book. A blog keeps its own frontmatter (`pubDate`, `draft`, `heroImage`) and types it with your schema. A book orders its chapters with the loader's `toc` option, numbers them with MyST's `numbering` options and builds a sidebar from each entry's position in that table of contents.

## A taste

Write this in a MyST file:

````markdown
The energy of a photon is given by @eq-photon.

```{math}
:label: eq-photon
E = h\nu
```
````

and you get a numbered equation with a working reference — here rendered live:

```{math}
:label: eq-photon
E = h\nu
```

The energy of a photon is given by @eq-photon. Hover the reference to preview the equation; the same works for references to other pages, like the [routing guide](#guide-routing).

## Next steps

- [](#getting-started) — install astro-myst and render your first pages
- [](#guide-writing) — the MyST features you can use
- [](#ref-options) — every option of `myst()` and `mystLoader()`
- [Examples on GitHub](https://github.com/BlackWild/astro-myst/tree/main/examples) — a minimal site, a book, and a LaTeX paper
