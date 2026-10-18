---
title: Writing content
label: guide-writing
description: The MyST features available in astro-myst pages, with live examples.
numbering:
  headings: true
---

astro-myst does not parse Markdown itself: `mystmd` does, so every MyST feature is available. The [MyST guide](https://mystmd.org/guide) is the authoritative reference; this page shows the most useful features as they render on this site, which uses astro-myst's optional theme. Headings on this page are numbered because its frontmatter sets `numbering.headings: true`.

## Frontmatter and project options

A page starts with optional YAML frontmatter. MyST reads the keys it knows, such as `title`, `authors`, `date`, `tags`, `numbering` or `math` (see MyST's [frontmatter reference](https://mystmd.org/guide/frontmatter)). Other keys, such as a blog's `pubDate` or `draft`, reach the entry's `data` as written; see [](#ref-entry-data).

```yaml
---
title: Measuring decay
date: 2025-03-14
tags: [physics]
numbering:
  headings: true
draft: true
---
```

Settings for all pages go into the `project` option, where a MyST site would use the `project:` section of a `myst.yml`: on the integration for every collection, or on a loader for one collection (see [](#ref-options)). Page frontmatter can override or extend them for a single page.

```ts
// astro.config.ts
myst({
  project: {
    numbering: { headings: true },
    math: { '\\dd': '\\mathrm{d}' },
    abbreviations: { AST: 'abstract syntax tree' },
  },
});
```

(sec-numbering)=
## Labels, numbering and references

Give anything a label and reference it with `@label`, `[](#label)` or a role such as `{numref}`:

````markdown
(sec-numbering)=
## Labels, numbering and references

```{math}
:label: eq-wave
\frac{\partial^2 u}{\partial t^2} = c^2 \nabla^2 u
```

See @eq-wave and [](#sec-numbering).
````

```{math}
:label: eq-wave
\frac{\partial^2 u}{\partial t^2} = c^2 \nabla^2 u
```

See @eq-wave and [](#sec-numbering). References work across all pages of a collection: [](#eq-photon) lives on the [home page](#astro-myst-home), and hovering it shows a preview.

Numbering is set with `numbering` in the frontmatter of a page or in the `project` option. By default MyST restarts figure, table and equation numbers on every page; `numbering.title: true` gives chapter-style numbers such as 2.1, and `numbering.figure.continue: true` numbers figures continuously across pages:

```ts
myst({ project: { numbering: { title: true, figure: { continue: true } } } });
```

See [MyST's numbering docs](https://mystmd.org/guide/cross-references#numbering).

## Figures and tables

````markdown
:::{figure} ../images/pipeline.svg
:label: fig-flow
:width: 80%
The build pipeline.
:::

:::{table} Supported sources
:label: tbl-sources
| Format | Extension |
|---|---|
| MyST Markdown | `.md` |
| LaTeX | `.tex` |
| Jupyter | `.ipynb` |
:::
````

:::{figure} ../images/pipeline.svg
:label: fig-flow
:width: 80%
The build pipeline.
:::

:::{table} Supported sources
:label: tbl-sources
| Format | Extension |
|---|---|
| MyST Markdown | `.md` |
| LaTeX | `.tex` |
| Jupyter | `.ipynb` |
:::

@fig-flow and @tbl-sources are numbered automatically. Figures with several images get sub-figures (`Figure 2a`, `Figure 2b`) that can be referenced individually. Image paths are relative to the page; astro-myst serves the images under `/_myst/<collection>/` and copies them into the build output.

## Math

Inline math ($e^{i\pi} + 1 = 0$), display math with `$$`, the `{math}` directive and LaTeX environments are rendered with KaTeX at build time, so pages need no client-side JavaScript for math. Macros for all pages go into the `project` option (in JavaScript strings, backslashes are doubled):

```ts
myst({ project: { math: { '\\dd': '\\mathrm{d}' } } });
```

Macros for one page go into its frontmatter:

```yaml
---
math:
  '\dd': '\mathrm{d}'
---
```

## Admonitions, dropdowns and tabs

:::{note}
Admonitions come in the usual kinds: `note`, `tip`, `important`, `warning`, `danger`, …
:::

:::{tip} Custom titles work too
Add a title after the directive name.
:::

:::{dropdown} A dropdown
Content that is hidden until opened.
:::

::::{tab-set}
:::{tab-item} npm
```sh
npm install astro-myst mystmd
```
:::
:::{tab-item} pnpm
```sh
pnpm add astro-myst mystmd
```
:::
:::{tab-item} yarn
```sh
yarn add astro-myst mystmd
```
:::
::::

## Theorems and proofs

```{prf:theorem} Pythagoras
:label: thm-pythagoras
For a right triangle with legs $a$, $b$ and hypotenuse $c$, $a^2 + b^2 = c^2$.
```

@thm-pythagoras is numbered within its kind; lemmas, definitions, corollaries and the other `prf:` kinds work the same way.

## Code

```{code-block} typescript
:label: code-loader
:caption: A collection of MyST pages.
:emphasize-lines: 4
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = { blog: defineCollection({ loader: mystLoader({ base: './src/content/blog' }) }) };
```

Code is highlighted with [Shiki](https://shiki.style) at build time; labelled listings such as @code-loader are numbered. To change the colours, see [](#guide-styling).

## Including files

`{include}` inserts another file into a page:

````markdown
```{include} _install.md
```
````

Start the names of files that are only included with `_`: the loader's default `pattern` skips them, so they do not become pages of their own. For files outside the collection folder, such as a README, also list them in the loader's `extraInputs`, so that `astro dev` recompiles when they change. This site includes its changelog that way.

## Footnotes, abbreviations and more

Footnotes are numbered per page.[^note] Abbreviations defined in the `project` option get a tooltip: the AST is what astro-myst renders.

[^note]: Like this one.

Other MyST features — `{embed}`, glossaries and terms, `{button}` links, cards and grids, `{iframe}`, `{mermaid}` — work as well. Mermaid diagrams are emitted as `pre.mermaid` with the diagram source, for [Mermaid.js](https://mermaid.js.org) to draw in the browser. Unknown directives from MyST plugins render as a visible placeholder until you add a [custom renderer](#guide-custom-renderers).
