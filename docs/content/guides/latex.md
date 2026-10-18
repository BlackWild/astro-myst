---
title: LaTeX sources
label: guide-latex
description: Use .tex files as pages, alongside MyST Markdown, with shared numbering and references.
---

mystmd parses LaTeX into the same AST as MyST Markdown [@mystmd], so `.tex` files are pages like any other. The [paper example](https://github.com/BlackWild/astro-myst/tree/main/examples/paper) is an article written in LaTeX with a Markdown supplement.

## Adding LaTeX pages

The loader's default `pattern` takes only Markdown files and notebooks. Add `.tex` to it:

```ts
// src/content.config.ts
mystLoader({ base: './src/content/papers', pattern: '**/[^_]*.{md,ipynb,tex}' });
```

or list the LaTeX files in `toc`, which adds them whatever the `pattern`. The paper example does that, with the article as the root page:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  paper: defineCollection({
    loader: mystLoader({
      base: './content',
      route: '/',
      toc: [{ file: 'index.tex' }, { file: 'supplement.md' }],
      project: { numbering: { headings: true } },
    }),
  }),
};
```

`index.tex` gets the entry id `index`, like an `index.md`, and is served at the `route` prefix itself.

### Files you `\input`

A file that another `.tex` file pulls in with `\input` must not become a page of its own. Start its name with `_` (`_methods.tex`, included with `\input{_methods}`), which the pattern above skips, or keep `.tex` out of `pattern` and list your LaTeX pages in `toc`. Either way, `astro dev` recompiles when the file changes, because the loader watches the whole collection folder.

## Page data

LaTeX pages have no YAML frontmatter. mystmd reads their metadata from the LaTeX source and normalizes it like Markdown frontmatter:

- `\title` becomes `data.title`;
- `\author` becomes `data.authors`, one object with a `name` per author (`\author{Ada Lovelace \and Erwin Example}` gives two);
- `\begin{abstract}` becomes an abstract section (`section.myst-part.myst-part-abstract`).

The entry's `body` is the full LaTeX source. Options that a Markdown page would set in its frontmatter, such as `numbering`, go into the loader's or the integration's `project` option.

## What works

- `\section`, `\subsection`, … with MyST's heading numbering
- `\label`, `\ref`, `\eqref` — also between `.tex` and `.md` pages, in both directions; labels with colons (`eq:main`) are fine
- `equation` and `align` environments, inline math, `\newcommand` macros
- `figure` with `\includegraphics` and `\caption`, `table` with `tabular`
- theorem-like environments declared with `\newtheorem`
- `\cite`, `\citet`, `\citep` with the collection's `.bib` files ([](#guide-citations)), and `\footnote`
- `\input` of other `.tex` files, and `siunitx` quantities

From Markdown, refer to LaTeX labels like any other: `[](#eq:main)` or `@eq:main`. You can also pull a LaTeX snippet into a Markdown page:

````markdown
```{include} _snippet.tex
```
````

## Limits

The LaTeX support is mystmd's own — see its [list of supported packages and macros](https://mystmd.org/guide/writing-in-latex). It is not a full TeX engine:

- Unsupported macros are dropped. mystmd reports each one with file, line and column, and astro-myst shows these messages in the Astro log.
- An `align` block gets a single equation number, attached to its first `\label`.
- Optional theorem titles such as `\begin{theorem}[Name]` are not carried over.
- Theorem-like environments are numbered per kind, even if they share a counter in LaTeX.
