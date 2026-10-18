---
title: Comparison
label: comparison
description: How astro-myst relates to MyST's own themes, Astro Markdown and other approaches.
---

## MyST's own websites (book and article themes)

`myst start` and `myst build --html` (and Jupyter Book 2, which is built on mystmd) produce complete websites with MyST's React themes, including features such as live Jupyter kernels. The project is configured in a `myst.yml`, and the theme provides navigation, layout and styling. Choose them when you want a documentation or book site with minimal setup.

Choose astro-myst when MyST content should live inside an Astro site: with your own design, alongside other Astro pages and collections, using Astro components, integrations and deployment targets. A blog with numbered equations, a book next to a marketing site, or a paper on a lab website are typical cases.

Both use the same compiler, so the Markdown, notebooks and LaTeX files are portable between them. The configuration is not: astro-myst reads no `myst.yml`. What a `myst.yml` would say goes in your Astro config instead — the integration's and loader's `project` options for the `project:` section, the loader's `toc` for the table of contents. The `site:` section has no counterpart apart from `numberedCitations` (MyST's `numbered_references`), because your Astro layout is the theme.

## Astro's Markdown, MDX and Markdoc

Astro's built-in Markdown processes each file independently. Plugins can add math or admonitions, but not numbering across files, cross-references to other pages or citation management. astro-myst complements them: other collections can keep using Markdown or MDX, and a MyST collection behaves much like a `glob()` one, with the same entry ids, your own frontmatter in `data` and your own schema. The difference is that its files are compiled together, by mystmd rather than by Astro's Markdown pipeline, so Astro's remark and rehype plugins do not apply to them.

## Hand-written AST renderers

Rendering MyST's JSON AST yourself is possible — mystmd's content server exposes it — and is what astro-myst automates: generating the MyST project from a content folder, running the compiler, URL mapping, assets in dev and in the build output, caching, dev-mode rebuilds and a renderer that covers MyST's node types, including cross-reference targets on other pages, equation numbers and citations.

## remark plugins for MyST syntax

Plugins that parse MyST *syntax* inside Astro's Markdown pipeline give you directives and roles in single files, but not MyST's resolution of numbers, references and citations across a project.
