---
title: Comparison
label: comparison
description: How astro-myst relates to MyST's own themes, Astro Markdown and other approaches.
---

## MyST's own websites (book and article themes)

`myst start` and `myst build --html` produce complete websites with MyST's React themes, including features such as live Jupyter kernels. Choose them when you want a documentation or book site with minimal setup.

Choose astro-myst when MyST content should live inside an Astro site: with your own design, alongside other Astro pages and collections, using Astro components, integrations and deployment targets. Both use the same compiler, so the content is portable between them.

## Astro's Markdown, MDX and Markdoc

Astro's built-in Markdown processes each file independently. Plugins can add math or admonitions, but not project-wide numbering, cross-references to other pages or citation management. astro-myst complements them: other collections can keep using Markdown or MDX.

## Hand-written AST renderers

Rendering MyST's JSON AST yourself is possible — mystmd's content server exposes it — and is what astro-myst automates: compilation, URL mapping, assets, caching, dev-mode rebuilds and a renderer that covers MyST's node types, including cross-reference targets on other pages, equation numbers and citations.

## remark plugins for MyST syntax

Plugins that parse MyST *syntax* inside Astro's Markdown pipeline give you directives and roles in single files, but not MyST's resolution of numbers, references and citations across a project.
