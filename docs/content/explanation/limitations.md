---
title: Limitations
label: limitations
description: Known limitations and their workarounds.
---

- **Static output.** Interactive features of MyST's React themes — live Jupyter kernels (Thebe), interactive widgets (`{anywidget}`, ipywidgets outputs) — are not reproduced. Their content renders statically. The browser features that need no kernel are optional [scripts](#ref-options-scripts): synchronized tabs (on by default), copy buttons on code and Mermaid diagrams.
- **Mermaid** diagrams need the `mermaid` package and the integration's `mermaid` script; without it they stay `<pre class="mermaid">` with the diagram source.
- **Exports** are made by mystmd ([](#guide-exports)). PDFs need a TeX distribution or Typst on the build machine, and mystmd downloads export templates from the network. Exports run in `astro build` only, unless you set `dev: true`.
- **One MyST project per collection.** Numbering, cross-references and citations work between the pages of a collection, not across collections. Link between collections with ordinary links, and to other MyST sites with external references ([](#guide-multiple-collections)).
- **Full recompiles in dev.** Any change recompiles the whole collection. This keeps numbering consistent, but very large collections take a few seconds per change. Other collections are not recompiled.
- **Files outside `base`** are watched in `astro dev` and part of the cache key only when listed in `extraInputs`. Bibliographies and plugins set in the `project` options are watched automatically.
- **LaTeX** support is mystmd's, which is not a full TeX engine ([](#guide-latex)).
- **Site options of MyST themes** (for example `hide_toc` or `logo` in a `myst.yml`'s `site.options`) have no counterpart: there is no `myst.yml`, and your Astro layout is the theme. For numbered citations, use the `numberedCitations` option ([](#ref-options)).
- **The integration is required.** `mystLoader()` throws unless `myst()` is in the `integrations` of `astro.config`, because the integration holds the shared options and serves and copies the images of MyST pages.
- **Frontmatter keys that MyST knows are normalized by MyST.** For example, `authors` becomes a list of objects and `thumbnail` and `banner` become URLs of images that mystmd copied, so Astro's `image()` helper cannot be used for them; use a key of your own for images that Astro should optimize ([](#ref-entry-data)).
- **Your own frontmatter keys come from Markdown files.** In notebooks and LaTeX files, only the keys MyST knows reach `data`, because mystmd drops the others and the loader reads raw frontmatter only from Markdown files.
