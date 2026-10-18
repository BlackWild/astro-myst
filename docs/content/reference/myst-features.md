---
title: MyST feature support
label: ref-myst-features
description: Every feature of MyST and mystmd, grouped by kind, and whether astro-myst supports it.
---

astro-myst hands parsing, numbering, references and citations to [mystmd](https://mystmd.org), so most MyST features work as soon as astro-myst renders their result. This page tracks every MyST feature and its status in astro-myst. It is updated with each change to the package.

| Status | Meaning |
|---|---|
| ✅ | Supported |
| ⚠️ | Partly supported; the note says what is missing |
| ❌ | Not supported yet |
| ➖ | Not applicable: in astro-myst, Astro does this job |

Statuses are checked against mystmd 1.11; the compatibility build also covers mystmd 1.3 and 1.8.

## Input formats

| Feature | Status | Notes |
|---|---|---|
| MyST Markdown (`.md`) | ✅ | |
| Jupyter notebooks (`.ipynb`) | ✅ | [](#guide-notebooks) |
| Markdown notebooks (`{code-cell}` and a `kernelspec`) | ✅ | |
| LaTeX (`.tex`) | ✅ | Parsed by mystmd; see [](#guide-latex) |
| MyST AST (`.myst.json`) | ⚠️ | Not in the loader's default `pattern`; add it to `pattern` to use such files |
| reStructuredText | ➖ | mystmd does not read RST |

## Inline markup and roles

| Feature | Status | Notes |
|---|---|---|
| Emphasis, strong, inline code, links, images | ✅ | |
| Strikethrough `{del}`, underline `{u}`, small caps `{sc}` | ✅ | |
| Subscript `{sub}`, superscript `{sup}` | ✅ | |
| Keyboard `{kbd}` | ✅ | |
| Abbreviations: `{abbr}` and the `abbreviations` project option | ✅ | Rendered as `<abbr title>` |
| Chemical formulas `{chem}` | ✅ | Numbers become subscripts |
| Units `{si}` | ✅ | Compound units typeset like siunitx (m s⁻²) |
| Inline math: `$…$` and `{math}` | ✅ | KaTeX HTML from mystmd |
| `{button}` | ✅ | `a.button.myst-button`; styled by the optional theme |
| `{span}` with classes | ✅ | |
| `{download}` | ✅ | The file is served with the other assets |
| `{term}` (glossary terms) | ✅ | |
| `{index}` entries | ✅ | |
| `{eval}` inline expressions | ✅ | Needs `--execute`; see [](#guide-notebooks) |
| `{raw:latex}`, `{raw:typst}` | ✅ | Left out of the HTML, used by exports |
| Raw HTML in Markdown | ✅ | |
| Comments (`%`) | ✅ | Not rendered |
| Footnotes | ✅ | Numbered per page, listed at the end of the page |

## Block directives

| Feature | Status | Notes |
|---|---|---|
| Admonitions (`{note}`, `{warning}`, … and `{admonition}`), custom titles | ✅ | |
| Dropdown admonitions (`:class: dropdown`) and `{dropdown}` | ✅ | `details`, work without JavaScript |
| `{aside}`, `{margin}`, `{sidebar}`, `{topic}` | ✅ | Margin notes can hang in the page margin with the `myst-margin-column` class; see [](#ref-components) |
| `{card}` (header, footer, link) | ✅ | |
| `{grid}`, `{grid-item}`, `{grid-item-card}` | ✅ | Columns per breakpoint |
| `{tab-set}`, `{tab-item}` | ✅ | Work without JavaScript |
| Synchronized tabs (`:sync:`) | ✅ | The integration's `syncTabs` script, on by default |
| `{figure}`, subfigures, captions, legends | ✅ | |
| `{image}`: width, height, alignment; videos (`.mp4`, …) | ✅ | |
| `{table}`, `{list-table}`, `{csv-table}` | ✅ | `{csv-table}` with inline data; mystmd 1.11 has no `:file:` option |
| `{code}` / `{code-block}`: caption, label, line numbers, emphasized lines, filename | ✅ | Highlighted with Shiki at build time |
| Copy buttons on code | ✅ | The integration's `copyCode` script |
| `{literalinclude}` | ✅ | |
| `{include}` (with `lines`, `start-after`, …) | ✅ | List files outside the collection in `extraInputs` |
| `{math}` and `$$…$$` display math, labels, `align` environments | ✅ | |
| `{mermaid}` | ✅ | Drawn by the integration's `mermaid` script (install `mermaid`); otherwise `pre.mermaid` |
| `{iframe}` | ✅ | |
| `{embed}` (also notebook outputs) | ✅ | |
| `{glossary}` | ✅ | |
| `{prf:…}` / `{proof:…}` theorems, lemmas, definitions, … | ✅ | |
| `{exercise}`, `{solution}`, gated `{exercise-start}` … `{exercise-end}` | ✅ | |
| `{div}` with classes | ✅ | |
| `{blockquote}`, `{epigraph}`, `{pull-quote}` | ✅ | |
| `{raw}` | ✅ | Left out of the HTML, used by exports |
| `{toc}` (page, section, children or project) | ✅ | `nav.myst-toc` |
| `{index}` and `{show-index}` (general index) | ✅ | |
| `{bibliography}` | ✅ | Places the references; without it they follow the page |
| Definition lists, task lists, tables, block quotes, thematic breaks | ✅ | |
| Directives and roles from MyST plugins | ✅ | Add a [custom renderer](#guide-custom-renderers) for new node types; until then they render as a visible placeholder |
| `{anywidget}` | ❌ | Interactive; see [Interactivity](#ref-myst-features-interactivity) |

## Cross-references and numbering

| Feature | Status | Notes |
|---|---|---|
| Labels: `(label)=`, `:label:` | ✅ | |
| References: `[](#label)`, `@label`, `{ref}`, `{numref}`, `{eq}`, `{doc}` | ✅ | |
| References across the pages of a collection | ✅ | |
| References to other MyST sites (`references` project option) | ✅ | |
| Numbering of figures, tables, equations, code, proofs, subfigures | ✅ | |
| Heading numbering and enumerator templates (`numbering` project option) | ✅ | |
| Page numbers (`numbering.title`) | ✅ | `data.myst.enumerator` |
| Hover previews of references and citations | ✅ | [`XrefPreview`](#ref-components) |
| References between collections | ❌ | Each collection is its own MyST project; see [](#limitations) |

## Math

| Feature | Status | Notes |
|---|---|---|
| KaTeX rendering of inline and display math | ✅ | Rendered by mystmd at build time; no JavaScript |
| Math macros (`math` project option) | ✅ | |
| Equation numbering and references | ✅ | |
| LaTeX environments (`align`, `cases`, …) | ✅ | |

## Citations and bibliography

| Feature | Status | Notes |
|---|---|---|
| BibTeX files | ✅ | `.bib` files in the collection folder are found automatically |
| `{cite}`, `{cite:p}`, `{cite:t}`, `[@key]` | ✅ | |
| DOI citations (fetched from doi.org) | ✅ | Cached in the build folder |
| Author–year and numbered citations | ✅ | `numberedCitations` |
| Placement of the bibliography | ✅ | `{bibliography}`, else at the end of the page |
| Citation styles (CSL) | ➖ | mystmd has none |

## Notebooks and computation

| Feature | Status | Notes |
|---|---|---|
| Stored outputs: text, streams, errors, images, HTML, large outputs | ✅ | |
| Cell tags `remove-*`, `hide-*` | ✅ | |
| Executing notebooks (`--execute`) and its cache | ✅ | [](#guide-notebooks) |
| `{eval}` inline expressions | ✅ | |
| Labelled outputs reused with `{embed}` | ✅ | |
| Outputs that need JavaScript (ipywidgets, some Plotly or Bokeh output) | ❌ | Interactive |
| Live kernels (Thebe, Binder, JupyterLite) | ❌ | Interactive |

## Project structure and navigation

| Feature | Status | Notes |
|---|---|---|
| Multi-page projects | ✅ | One collection is one MyST project |
| Table of contents: order, nesting, groups, patterns | ✅ | The loader's `toc` option; see [](#guide-routing) |
| Sidebar tree with groups, previous/next, breadcrumbs | ✅ | `mystNavigation()`, `mystPrevNext()`, `data.myst.parents` |
| On-page outline | ✅ | `headings` from `render(entry)` |
| Project options (`numbering`, `math`, `abbreviations`, `references`, `plugins`, `bibliography`, …) | ✅ | [](#ref-options-project) |
| Several MyST projects in one site | ✅ | One per collection; see [](#guide-multiple-collections) |
| `extends` (shared myst.yml files) | ❌ | Put shared options in the integration's `project` option instead |
| Incremental builds | ⚠️ | Unchanged collections are reused; a change recompiles its whole collection |

## Frontmatter and metadata

| Feature | Status | Notes |
|---|---|---|
| `title`, `subtitle`, `short_title`, `description`, `date`, `tags`, `keywords` | ✅ | Normalized by mystmd; see [](#ref-entry-data) |
| `authors` with affiliations, ORCID, email, roles | ✅ | Affiliation names resolved |
| `thumbnail`, `banner` | ✅ | Served with the assets |
| `doi` | ✅ | |
| Your own frontmatter keys | ✅ | Kept as written (mystmd drops keys it does not know) |
| `license`, `venue`, `biblio`, `funding`, `github`, … | ⚠️ | In `data` as written; MyST's normalized form is in `render(entry).remarkPluginFrontmatter` |
| Parts: `abstract`, `summary`, `keypoints`, `acknowledgments`, `data_availability`, … | ✅ | Rendered in the page and in `data.myst.parts` |
| `downloads` | ✅ | `data.myst.downloads` |
| `exports` | ✅ | Built when their format is enabled in the `exports` option; an `output` path is refused |

## Exports

mystmd makes the files; astro-myst declares them and serves them. Its tests run the Markdown and JATS exports, which work offline. PDF, LaTeX, Typst and Word exports take the same path, but mystmd downloads their templates, and PDFs need LaTeX or Typst installed.

| Feature | Status | Notes |
|---|---|---|
| PDF via LaTeX | ✅ | Needs a TeX distribution with `latexmk`; see [](#guide-exports) |
| PDF via Typst | ✅ | Needs the `typst` CLI |
| LaTeX sources | ✅ | A zip of the `.tex` file and its figures |
| Typst sources | ❌ | Typst exports are typeset to PDF |
| Word (`.docx`) | ✅ | |
| Markdown | ⚠️ | mystmd's Markdown export skips some nodes (proofs, `{si}`, …) |
| JATS XML | ⚠️ | mystmd's JATS export skips `{include}` |
| One file of a whole collection (book) | ✅ | PDF, Typst or LaTeX |
| Templates | ✅ | By name, URL or folder |
| MECA, CFF | ❌ | |
| Exports in `astro dev` | ✅ | Opt-in with `dev: true` |

## Site and theme

In astro-myst, your Astro layout is the theme. These features of MyST's own themes are either provided by astro-myst or left to your layout.

| Feature | Status | Notes |
|---|---|---|
| Dark mode | ✅ | Code and the optional theme follow the system setting or a `.dark` class |
| Download links | ✅ | From `data.myst.downloads` and `data.myst.exports` in your layout |
| "Edit this page" links | ✅ | `entry.filePath` |
| Article header: authors, affiliations, DOI, license | ✅ | From entry data in your layout |
| Margin column for margin notes | ✅ | `myst-margin-column` class with the optional theme |
| Search | ➖ | Use an Astro search integration such as Pagefind |
| `site` options of MyST themes (logo, nav, analytics, `hide_toc`, …) | ➖ | Your layout and Astro configuration |
| Social cards, optimized thumbnails | ➖ | Astro's image tools and your layout |

(ref-myst-features-interactivity)=
## Interactivity

Not supported for now: astro-myst pages are static HTML.

| Feature | Status | Notes |
|---|---|---|
| Live kernels (Thebe), Binder, JupyterLite | ❌ | |
| ipywidgets and `{anywidget}` | ❌ | |
| Interactive figures that need JavaScript from notebook outputs | ❌ | |

## Extending MyST

| Feature | Status | Notes |
|---|---|---|
| JavaScript plugins (directives, roles, transforms) | ✅ | `plugins` project option; render new node types with `handlers` |
| Executable plugins (Python and others) | ✅ | |
| Custom rendering of any node | ✅ | [](#guide-custom-renderers) |
