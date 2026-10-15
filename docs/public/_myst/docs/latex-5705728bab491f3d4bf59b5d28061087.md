---
title: LaTeX sources
label: guide-latex
description: Use .tex files as pages, alongside MyST Markdown, with shared numbering and references.
---

mystmd parses LaTeX into the same AST as MyST Markdown [@mystmd], so `.tex` files are pages like any other. The [paper example](https://github.com/BlackWild/astro-myst/tree/main/examples/paper) is an article written in LaTeX with a Markdown supplement.

## Adding a LaTeX page

List the file in the `toc` of `myst.yml`:

```yaml
project:
  toc:
    - file: index.md
    - file: paper.tex
```

Without an explicit `toc`, MyST turns every `.tex` file in the folder into a page, including fragments that are only `\input` by another file, so an explicit `toc` is recommended.

## What works

- `\title`, `\author` become page metadata (`data.title`, `data.authors`); `\begin{abstract}` becomes an abstract section
- `\section`, `\subsection`, … with MyST's heading numbering
- `\label`, `\ref`, `\eqref` — also between `.tex` and `.md` pages, in both directions; labels with colons (`eq:main`) are fine
- `equation` and `align` environments, inline math, `\newcommand` macros
- `figure` with `\includegraphics` and `\caption`, `table` with `tabular`
- theorem-like environments declared with `\newtheorem`
- `\cite`, `\citet`, `\citep` with the project's `.bib` files, and `\footnote`
- `\input` of other `.tex` files, and `siunitx` quantities

From Markdown, refer to LaTeX labels like any other: `[](#eq:main)` or `@eq:main`. You can also pull a LaTeX snippet into a Markdown page:

````markdown
```{include} snippet.tex
```
````

## Limits

The LaTeX support is mystmd's own — see its [list of supported packages and macros](https://mystmd.org/guide/writing-in-latex). It is not a full TeX engine:

- Unsupported macros are dropped. mystmd reports each one with file, line and column, and astro-myst shows these messages in the Astro log.
- An `align` block gets a single equation number, attached to its first `\label`.
- Optional theorem titles such as `\begin{theorem}[Name]` are not carried over.
- Theorem-like environments are numbered per kind, even if they share a counter in LaTeX.
