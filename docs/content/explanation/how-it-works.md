---
title: How it works
label: how-it-works
description: The pipeline from MyST sources to Astro pages, and why it is built this way.
---

## The pipeline

1. **Compile with mystmd.** The loader runs `myst build --site` in the MyST project — the same command MyST's own websites use. mystmd parses MyST Markdown, LaTeX and notebooks, runs every transform (directives, roles, includes, embeds, notebook outputs, citations, KaTeX) and then resolves numbering and cross-references across *all* pages. The output is one JSON AST per page in `_build/site/content/`, plus a manifest with the table of contents.
2. **Render to HTML.** For every page, astro-myst walks the AST and builds HTML. Because mystmd has already done the semantic work, rendering is a direct mapping: a `crossReference` node already carries its text ("Figure 2") and target page, a `math` node carries KaTeX's HTML and its equation number, a `cite` node carries the formatted citation. MyST URLs such as `/theory#eq-1` are rewritten to your routes, honouring Astro's `base`, `trailingSlash` and the loader's `routeBase`.
3. **Store entries.** Each page is stored in Astro's content layer with its rendered HTML, headings and typed data. `render(entry)` then returns a `<Content />` component without any Markdown processing in Astro.
4. **Copy assets.** Images, notebook outputs and downloads written by mystmd are copied to `public/<assetsDir>`, where Astro serves and deploys them.

## Why run the real compiler?

MyST's JavaScript packages (`myst-parser`, `myst-transforms`) could be called directly. But numbering and references across pages, citations from BibTeX and DOIs, includes, notebooks and LaTeX are orchestrated by `mystmd` itself, and re-implementing that orchestration would mean chasing mystmd's behaviour release after release. Running the CLI gives exactly what MyST users expect, and upgrading mystmd upgrades the features.

A Markdown/remark plugin was also considered: Astro's Markdown pipeline renders one file at a time, so it cannot know that a figure in another file is "Figure 3". MyST's model needs the whole project.

## The theme stub

`myst build --site` validates the site's web theme and downloads it into `_build/templates` if missing. An Astro site does not use that theme, so the loader places a minimal stub template there for the duration of the build and removes it afterwards. Builds therefore work offline and never download the React theme. A real theme that is already present (for example because you also run `myst start`) is left untouched.

## Caching and dev mode

The loader fingerprints the files of the MyST project (paths, sizes, modification times) together with the mystmd version and options. If nothing changed since the last build, the previous mystmd output is reused and only rendering runs. In `astro dev`, any change to the project triggers a full recompile — necessary because one new figure can renumber references on every page — and the content layer updates all entries.
