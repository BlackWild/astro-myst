---
title: Writing content
label: guide-writing
description: The MyST features available in astro-myst pages, with live examples.
numbering:
  headings: true
---

astro-myst does not parse Markdown itself: `mystmd` does, so every MyST feature is available. The [MyST guide](https://mystmd.org/guide) is the authoritative reference; this page shows the most useful features as they render with astro-myst's default styles. Headings on this page are numbered because its frontmatter sets `numbering.headings: true`.

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

See @eq-wave and [](#sec-numbering). References work across pages: [](#eq-photon) lives on the [home page](#astro-myst-home), and hovering it shows a preview.

Numbering is configured in the frontmatter of a page or in `myst.yml` (`numbering:`). By default MyST restarts figure, table and equation numbers on every page; `numbering.title: true` gives chapter-style numbers such as 2.1, and `numbering.figure.continue: true` numbers figures continuously across pages. See [MyST's numbering docs](https://mystmd.org/guide/cross-references#numbering).

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

@fig-flow and @tbl-sources are numbered automatically. Figures with several images get sub-figures (`Figure 2a`, `Figure 2b`) that can be referenced individually.

## Math

Inline math ($e^{i\pi} + 1 = 0$), display math with `$$`, the `{math}` directive and LaTeX environments are rendered with KaTeX at build time, so pages need no client-side JavaScript for math. Project-wide macros go into `myst.yml`:

```yaml
project:
  math:
    '\dd': '\mathrm{d}'
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
:caption: A collection backed by a MyST project.
:emphasize-lines: 4
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst';

export const collections = { docs: defineCollection({ loader: mystLoader({ root: './content' }) }) };
```

Code is highlighted with [Shiki](https://shiki.style) at build time; labelled listings such as @code-loader are numbered.

## Footnotes, abbreviations and more

Footnotes are numbered per page.[^note] Abbreviations defined in `myst.yml` get a tooltip: the AST is what astro-myst renders.

[^note]: Like this one.

Other MyST features — `{include}`, `{embed}`, glossaries and terms, `{button}` links, cards and grids, `{iframe}`, `{mermaid}` — work as well. Unknown directives from MyST plugins render as a visible placeholder until you add a [custom renderer](#guide-custom-renderers).
