---
title: astro-myst
label: astro-myst-home
short_title: Overview
subtitle: MyST Markdown for Astro, compiled by the official mystmd engine
description: Use MyST Markdown, LaTeX and Jupyter notebooks as content in Astro sites, with automatic numbering, cross-references, citations and math.
---

**astro-myst** is an [Astro](https://astro.build) content loader that compiles your content with [MyST](https://mystmd.org), the Markedly Structured Text toolchain used by Jupyter Book. Everything MyST knows about scientific and technical writing — numbered sections, figures, tables and equations, cross-references between pages, citations, math, LaTeX sources and notebooks — arrives in Astro as ordinary content collection entries. Your layout, routing and styling stay entirely yours.

```{figure} images/pipeline.svg
:label: fig-pipeline
:alt: MyST sources are compiled by mystmd, rendered to HTML by astro-myst and served by Astro.
How a page gets from a MyST source file to your Astro site.
```

## Why

Astro's Markdown pipeline renders one file at a time, so it cannot number a figure in one file and reference it from another. MyST is built for exactly that, and `mystmd` already resolves numbering, references and citations across a whole project [@mystmd]. astro-myst runs that compiler and hands the result to Astro, as shown in @fig-pipeline. This page is itself an example: it is written in MyST and rendered by astro-myst.

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

:::{card} Astro-native
Entries work with `getCollection()`, `render()` and `<Content />`; links follow your `base`, routes and `trailingSlash`.
:::

::::

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

- [](#getting-started) — install astro-myst and render your first page
- [](#guide-writing) — the MyST features you can use
- [](#ref-loader-options) — every option of `mystLoader()`
- [Examples on GitHub](https://github.com/BlackWild/astro-myst/tree/main/examples) — a minimal site, a book, and a LaTeX paper
