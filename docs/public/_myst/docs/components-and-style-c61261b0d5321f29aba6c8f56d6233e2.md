---
title: Components and styles
label: ref-components
description: The XrefPreview component, the stylesheets, CSS custom properties and emitted markup.
---

## `astro-myst/XrefPreview.astro`

Shows a preview of the referenced figure, equation, table, theorem, section or bibliography entry when a cross-reference or citation is hovered or focused. Targets on other pages are fetched once and cached. Previews are disabled on devices without hover, and `Esc` closes them.

```astro
---
import XrefPreview from 'astro-myst/XrefPreview.astro';
---

<XrefPreview />
```

| Prop | Default | Description |
|---|---|---|
| `selector` | `'a.xref, a.cite'` | Links that get previews |
| `delay` | `150` | Delay in milliseconds before a preview opens |

Add it once per page, for example in your layout. It removes its listeners when it leaves the page, so view transitions (`<ClientRouter />`) do not stack previews.

## Stylesheets

| Import | Contents |
|---|---|
| `astro-myst/styles.css` | Default styles for all emitted markup, scoped to `.myst` |
| `astro-myst/katex.css` | KaTeX styles matching the math HTML pre-rendered by mystmd |

## Custom properties

Set on `.myst` (light values by default, dark values under `prefers-color-scheme: dark`):

| Property | Used for |
|---|---|
| `--myst-accent` | Links, cross-references, active tabs |
| `--myst-muted` | Numbers, captions, secondary text |
| `--myst-border` | Borders and rules |
| `--myst-surface` | Backgrounds of admonitions, proofs, code blocks |
| `--myst-xref-bg` | Background of cross-reference chips and highlighted lines |
| `--myst-note`, `--myst-tip`, `--myst-warning`, `--myst-danger` | Admonition colours |
| `--myst-proof` | Theorem and proof accent |
| `--myst-preview-bg` | Background of hover previews |

## Emitted markup

| Content | Markup |
|---|---|
| Section heading | `h2#id > span.heading-number + text + a.heading-anchor` |
| Display math | `div.math-display#id > div.math-body + span.equation-number` |
| Inline math | `span.math-inline` |
| Figure, table, listing | `figure.myst-container.myst-{kind}#id > … + figcaption > span.caption-number`; sub-figures add `.subfigure` |
| Table | `div.table-wrapper > table > thead + tbody` |
| Code | `div.code-wrapper > pre.shiki.code-block > code > span.line`; `.highlighted` lines; `div.code-filename` |
| Cross-reference | `a.xref[data-xref-kind]`, plus `[data-xref-remote]` for other pages and `[data-xref-external]` for other sites; unresolved: `span.xref.xref-unresolved` |
| Citation | `a.cite[data-cite]` inside `span.cite-group`; missing: `span.cite.cite-error` |
| Bibliography | `section.bibliography > ol.bibliography-list > li#cite-…` (`.numbered` for numbered citations) |
| Footnotes | `sup.footnote-ref > a`, `section.footnotes > ol > li#fn-…` |
| Admonition | `aside.admonition.admonition-{kind} > .admonition-title + .admonition-body`; dropdowns use `details` |
| Theorem-like | `aside.proof.proof-{kind}#id > .proof-title + .proof-body` |
| Abstract and other parts | `section.myst-part.myst-part-{name} > h2.part-title` |
| Tabs | `div.tab-set > (input + label + div.tab-panel)*` (CSS only) |
| Grid, card | `div.grid` with `--grid-cols-{i}` variables, `div.card` or `a.card` |
| Notebook | `div.notebook-cell`, `div.outputs > (pre.output-stream, pre.output, div.output, pre.output-error)`; hidden content in `details.myst-hidden` |
| Unknown directive or role | `div.myst-unhandled` / `span.myst-unhandled` |
