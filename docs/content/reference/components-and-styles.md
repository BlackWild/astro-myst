---
title: Components and styles
label: ref-components
description: The XrefPreview component, the stylesheets, CSS custom properties and the HTML astro-myst emits.
---

## `astro-myst/XrefPreview.astro`

Shows a preview of the referenced figure, equation, table, theorem, section or bibliography entry when a cross-reference or citation is hovered or focused. Targets on other pages of your site are fetched once and cached. Previews are disabled on devices without hover, and `Esc` closes them.

```astro
---
import XrefPreview from 'astro-myst/XrefPreview.astro';
---

<XrefPreview />
```

| Prop | Default | Description |
|---|---|---|
| `selector` | `'a.myst-xref, a.myst-cite'` | CSS selector of the links that get previews |
| `delay` | `150` | Delay in milliseconds before a preview opens |

Add it once per page, for example in your layout. It removes its listeners when it leaves the page, so view transitions (`<ClientRouter />`) do not stack previews.

The preview is a `div.myst.myst-preview` with `role="tooltip"`, appended to `<body>`. It holds a copy of the target element (for a section heading: the heading and the two elements after it), preceded by `div.myst-preview-source` with the title of the page when the target is on another page. `base.css` draws the box; `theme.css` adds its colours.

## Stylesheets

| Import | Added by | Contents |
|---|---|---|
| `astro-myst/katex.css` | `styles: 'base'` and `'theme'` | KaTeX's styles, matching the math HTML that mystmd pre-renders (KaTeX 0.15.6) |
| `astro-myst/base.css` | `styles: 'base'` and `'theme'` | Only what MyST content needs to work: equation numbers, scrolling for wide content, code colours in dark mode, line numbers, tabs, grids, figure layout, heading anchors, bibliography markers, the preview box |
| `astro-myst/theme.css` | `styles: 'theme'` | An optional look for MyST components, and for tables and link targets inside `.myst` |

With `styles: false`, import them yourself (see [](#guide-styling)). Every rule in `base.css` and `theme.css` has zero specificity (`:where()`), except the custom properties that `theme.css` declares on `:root`, `.dark` and `[data-theme="dark"]`, and sits in the cascade layer `components`; both files first declare Tailwind 4's layer order, `@layer theme, base, components, utilities`. The two `base.css` overrides of KaTeX's (unlayered) stylesheet are not in a layer.

Both switch to dark mode when the system prefers it, unless `<html>` has the class `light` or `data-theme="light"`, and when an ancestor has the class `dark` or `data-theme="dark"`.

## Custom properties

Declared by `theme.css` on `:root`. The dark values apply in dark mode, as described above.

| Property | Light | Dark | Used for |
|---|---|---|---|
| `--myst-accent` | `#1f5f8b` | `#79b8e8` | Cross-references, citations, footnote links, the active tab, hovered link cards |
| `--myst-muted` | `#5f6b76` | `#9aa5b1` | Heading and equation numbers, heading anchors, captions, part titles, inactive tabs, sidebars |
| `--myst-border` | `#d9dee3` | `#2f3740` | Borders and rules |
| `--myst-surface` | `#f6f8fa` | `#161b22` | Backgrounds of admonitions, proofs, code blocks without highlighting and previews |
| `--myst-note` | `#2f6fb0` | `#6aa7e6` | `note` admonitions and kinds without a colour of their own |
| `--myst-tip` | `#2e8540` | `#5fbf73` | `tip`, `hint` and `seealso` admonitions |
| `--myst-warning` | `#b7791f` | `#e0a84a` | `warning`, `caution`, `attention` and `important` admonitions |
| `--myst-danger` | `#c0392b` | `#ef6f61` | `danger` and `error` admonitions, unresolved references, missing citations, unhandled directives, notebook errors |
| `--myst-proof` | `#6b4fa1` | `#b39ddb` | Theorems, proofs and other `prf:` kinds |
| `--myst-highlight` | `rgba(31, 95, 139, 0.08)` | `rgba(121, 184, 232, 0.12)` | Background of cross-references, highlight of the target of a followed link |

Other custom properties:

| Property | Where | Purpose |
|---|---|---|
| `--myst-c` | `theme.css`, on each admonition | Colour of the admonition's border and title: `var(--myst-note)`, `var(--myst-tip)`, … by kind. Set it on a class of your own to colour an admonition, for example one with `:class: success`. |
| `--myst-preview-bg`, `--myst-preview-fg` | Read by `base.css`, defaulting to `Canvas` and `CanvasText`; `theme.css` sets the background to `var(--myst-surface)` on `.myst-preview` | Background and text colour of hover previews |
| `--myst-grid-cols-0` … `--myst-grid-cols-3` | The renderer, as an inline style of each grid | Columns of a `{grid}`: `-0` on narrow screens, `-1` from 576 px, `-2` from 768 px, `-3` from 992 px |
| `--shiki-dark`, `--shiki-dark-bg`, … | Shiki, as inline styles of code | Dark theme colours that `base.css` switches to in dark mode |

## Emitted markup

The classes astro-myst adds start with `myst-`, except `mermaid` (for Mermaid.js), Shiki's `shiki`, `shiki-themes` and theme names on code blocks, `line` and `highlighted` on code lines, `task-list-item` and `language-…`. Classes that authors set with a directive's `:class:` option are kept as written, as is MyST's `button` class from the `{button}` role. Labelled elements get an `id` that MyST makes from the label: lowercase, with other characters than letters, digits and `-` replaced by `-` (`eq:main` becomes `eq-main`).

| Content | Markup |
|---|---|
| Section heading | `h2#id > span.myst-heading-number + text + a.myst-heading-anchor` (`h1` to `h6` by depth; the number only when headings are numbered) |
| Inline math | `span.myst-math-inline` with KaTeX's HTML |
| Display math | `div.myst-math-display#id > div.myst-math-body + span.myst-equation-number` |
| Figure, table, code listing | `figure.myst-container.myst-{kind}#id[data-kind]`, plus `.myst-numbered` when numbered and `.myst-subfigure` for sub-figures; caption `figcaption > span.myst-caption-number`; legend `div.myst-legend` |
| Image | `img` (lazy loading); `:align:` adds `.myst-align-left`, `.myst-align-center` or `.myst-align-right`. `.mp4` files become `video` (autoplay, muted, loop, playsinline). |
| Table | `div.myst-table-wrapper > table > thead + tbody` |
| Code | `div.myst-code-wrapper#id[data-lang] > div.myst-code-filename + pre.shiki.myst-code-block > code > span.line`; `.myst-line-numbers` on the `pre` with line numbers, `span.line.highlighted` for emphasized lines. Without highlighting: `pre.myst-code-block > code.language-{lang}`. A listing with a caption is wrapped in `figure.myst-container.myst-code`. |
| Mermaid diagram | `pre.mermaid` with the diagram source |
| Iframe | `div.myst-iframe > iframe` |
| Cross-reference | `a.myst-xref[data-xref-kind]`, plus `[data-xref-remote]` for targets on other pages and `[data-xref-external]` for other MyST sites; unresolved: `span.myst-xref.myst-xref-unresolved` |
| Citation | `a.myst-cite[data-cite]` linking to `#cite-{label}`, inside `span.myst-cite-group` for groups; missing: `span.myst-cite.myst-cite-error` |
| Bibliography | `section.myst-bibliography > h2 + ol.myst-bibliography-list > li#cite-{label}` (`cite-knuth1984`; for a DOI `cite-doi-10.5281-zenodo.6476040`); with numbered citations `ol.myst-numbered` and `li[data-enumerator]` |
| Footnotes | `sup.myst-footnote-ref > a#fnref-{key}` (further references to the same footnote: `#fnref-{key}-2`, …); `section.myst-footnotes > h2.myst-footnotes-title + ol > li#fn-{key}`, ending with `a.myst-footnote-backref` |
| Admonition | `aside.myst-admonition.myst-admonition-{kind} > div.myst-admonition-title + div.myst-admonition-body`; with `:class: dropdown`: `details.myst-admonition > summary.myst-admonition-title + div.myst-admonition-body` |
| Dropdown | `details.myst-dropdown > summary.myst-dropdown-title` (from `{dropdown}`; `[open]` with `:open:`) |
| Theorem, proof, exercise, solution | `aside.myst-proof.myst-proof-{kind}#id > div.myst-proof-title + div.myst-proof-body`; the title holds `strong` ("Theorem 1") and the optional title in parentheses |
| Abstract and other parts | `section.myst-part.myst-part-{name}[data-part] > h2.myst-part-title` |
| Tabs | `div.myst-tabs > (input[type=radio] + label + div.myst-tab-panel)*`, working without JavaScript |
| Grid | `div.myst-grid` with `--myst-grid-cols-0` … `--myst-grid-cols-3` |
| Card | `div.myst-card`, or `a.myst-card` with `:link:`; inside `div.myst-card-header`, `div.myst-card-title`, `div.myst-card-footer` |
| Aside, margin note, sidebar | `aside.myst-aside.myst-aside-{kind}`: `myst-aside-sidebar` for `{sidebar}`, `myst-aside-topic` for `{topic}`; `{aside}` and `{margin}` get `myst-aside-margin`. An optional title is a `div.myst-admonition-title`. |
| Glossary | `div.myst-glossary > dl > dt#id + dd` |
| Abbreviation, keyboard, small caps, units | `abbr[title]`, `kbd`, `span.myst-smallcaps`, `span.myst-si` |
| Button | `a.button` from the `{button}` role |
| Task list item | `li.task-list-item > input[type=checkbox][disabled]` |
| Notebook cell | `div.myst-notebook-cell` with the code and `div.myst-outputs#id` |
| Notebook output | `pre.myst-output-stream.stdout` (or `.stderr`), `pre.myst-output-error`, `div.myst-output` with an image, `div.myst-output.myst-output-html`, `pre.myst-output` with plain text |
| Hidden cell, input or output | `details.myst-hidden > summary` ("Show code", "Show output", "Show cell") followed by the content |
| Unknown directive or role | `div.myst-unhandled` / `span.myst-unhandled` with the source in `code` |
| Other unknown node types | `div.myst-{type}`, or `span.myst-{type}` inside paragraphs, headings and captions |

Change any of these with a [custom renderer](#guide-custom-renderers).
