---
title: How it works
label: how-it-works
description: The pipeline from a folder of MyST files to Astro pages, and why it is built this way.
---

astro-myst has two parts. The integration, `myst()` in `astro.config.ts`, holds the options shared by all MyST collections, adds the stylesheets and the optional browser scripts to every page, and serves and copies the images and exported files of MyST pages. The loader, `mystLoader()` in `src/content.config.ts`, turns one folder into one collection. It reads the integration's options, which is why it fails without the integration.

## The pipeline

For each collection, the loader runs these steps when Astro loads content: on `astro build`, `astro sync` and when `astro dev` starts, and again in `astro dev` whenever one of the collection's files changes.

1. **Find the files.** The files below `base` that match `pattern` (by default Markdown files and notebooks whose names do not start with `_`) are the collection's pages. Folders such as `node_modules`, `_build`, `.git` and `.ipynb_checkpoints` are skipped.
2. **Generate a MyST project.** mystmd compiles projects described by a `myst.yml`. The loader writes one for the collection in Astro's cache folder, `<cacheDir>/astro-myst/<collection>/` (`node_modules/.astro/astro-myst/<collection>/` by default). It holds the MyST options (the integration's `project` with the loader's `project` merged over it) and a table of contents that lists the collection's files where they are, through relative paths, so nothing is copied or written next to your content.
3. **Compile with mystmd.** The loader runs `myst build --site` in the generated project. mystmd parses MyST Markdown, LaTeX and notebooks, runs every transform (directives, roles, includes, embeds, notebook outputs, citations, KaTeX) and then resolves numbering and cross-references across *all* pages of the collection. The output is one JSON AST per page in `_build/site/content/`, plus a manifest with the table of contents. With the [`exports` option](#guide-exports), the same run also exports the pages (PDF, Word, LaTeX, …) into `_build/exports/astro-myst/`, which is cleared first. mystmd's warnings and errors appear in the Astro log.
4. **Read the frontmatter.** The loader reads each Markdown file's frontmatter itself, because mystmd validates frontmatter and drops the keys it does not know, such as `pubDate` or `draft`.
5. **Render to HTML.** For every page, astro-myst walks the AST and builds HTML. Because mystmd has already done the semantic work, rendering is a direct mapping: a `crossReference` node already carries its text ("Figure 2") and target page, a `math` node carries KaTeX's HTML and its equation number, a `cite` node carries the formatted citation. MyST URLs such as `/theory#eq-1` are rewritten to your pages' URLs, honouring the loader's `route` and Astro's `base` and `trailingSlash`.
6. **Publish assets.** The images, videos and downloads that the rendered pages use, and the exported files, are copied from mystmd's output into the generated project's `assets/` folder, ready to be served.
7. **Store entries.** Each page is stored in Astro's content layer with an id like `glob()` gives it, its rendered HTML, headings and data, replacing the collection's previous entries. `render(entry)` then returns a `<Content />` component without any Markdown processing in Astro.

All pages are rendered before anything is replaced, so a failing page never leaves a half-updated collection. When no input changed since the last build, steps 2 and 3 are skipped and mystmd's previous output is used ([see below](#how-it-works-caching)).

## The generated project

For a blog in `src/content/blog/` with an `index.md`, two posts and a `references.bib`, the generated `myst.yml` looks like this:

```yaml
# node_modules/.astro/astro-myst/blog/myst.yml (generated)
version: 1
project:
  id: astro-myst-blog
  bibliography:
    - ../../../../src/content/blog/references.bib
  toc:
    - file: ../../../../src/content/blog/index.md
    - file: ../../../../src/content/blog/first-post.md
    - file: ../../../../src/content/blog/second-post.md
site: {}
```

- **Table of contents.** It follows the loader's `toc` option, with files that `toc` does not list appended at the end. Without `toc`, the `index` file comes first and the other files follow alphabetically.
- **Root page.** MyST treats the first entry of the table of contents as the project's root page: the collection's `index` file, or the first entry of your `toc`. When that is not a file (there is no `index` file, or your `toc` starts with a group), the loader adds a placeholder `index.md` to the generated project as the root page. It is compiled with the rest but never becomes an entry.
- **Bibliographies.** mystmd uses the `.bib` files in its project folder, and that folder is now the generated one. So while `project.bibliography` is not set, the loader lists the `.bib` files it finds below `base`.
- **File paths in options.** Paths in `project`, such as `bibliography` and `plugins`, are relative to the Astro root in your config and are rewritten relative to the generated project.
- **Exports.** With the `exports` option, the loader declares one project export per page and format (and one per format for the whole collection), with outputs inside the generated project. Project exports, unlike exports in page frontmatter, write their files relative to the `myst.yml`, so nothing lands next to your content.

The folder also holds mystmd's `_build/` (its output, plus caches such as downloaded DOI metadata) and `assets/`.

## Frontmatter

mystmd normalizes the frontmatter keys it knows: `authors` becomes a list of objects, for example, and `thumbnail` and `banner` become the URLs of copied images. Any other key would be lost, so the loader parses each Markdown file's frontmatter as Astro's own Markdown loader does (dates become `Date`s) and builds `data` from both: your keys as written, overridden by the keys MyST knows as MyST normalized them, plus `myst` with the URL and position of the page. mystmd's warnings about frontmatter keys it ignores are hidden, because those keys are yours. Your collection's schema validates the result ([](#ref-entry-data)).

## Assets

mystmd copies the images and downloads that pages use into its output, under hashed names (`figure-<hash>.png`). astro-myst rewrites their URLs to `<base>/_myst/<collection>/<file>` and serves them from there:

- **In `astro dev`**, a middleware added by the integration serves them straight from the generated project's `assets/` folder in the cache.
- **In `astro build`**, the integration copies them into the build output (`dist/_myst/<collection>/`, or the client folder for server output) in the `astro:build:generated` hook, before adapters package the output ([](#guide-deployment)).

`public/` is never touched.

(how-it-works-caching)=
## Caching and dev rebuilds

The loader fingerprints its inputs together with the versions of astro-myst and mystmd (for a `command` or a `myst` found on the `PATH`, only its name), the `args` and the generated `myst.yml`, and keeps the fingerprint in Astro's data store. The inputs are the files below `base`, the `extraInputs`, and the files that `project` points to, such as bibliographies and plugins; each counts by path, size and modification time. Astro's own folders (`public/`, the build output, the cache folder, `.astro/`, `node_modules/`) never count as inputs, since builds write to them. If nothing changed since the last build, the previous mystmd output is reused and only rendering runs. `cache: false` turns this off.

In `astro dev`, the loader watches the same inputs. Any change recompiles the whole collection — necessary because one new figure can renumber references on every page — and the content layer updates all its entries. Other collections are not recompiled. If compiling or rendering fails, the error is logged and the last good pages stay; `astro build` fails instead, with the message prefixed `[astro-myst]`.

## Why run the real compiler?

MyST's JavaScript packages (`myst-parser`, `myst-transforms`) could be called directly. But numbering and references across pages, citations from BibTeX and DOIs, includes, notebooks and LaTeX are orchestrated by `mystmd` itself, and re-implementing that orchestration would mean chasing mystmd's behaviour release after release. Running the CLI gives exactly what MyST users expect, and upgrading mystmd upgrades the features.

A Markdown/remark plugin was also considered: Astro's Markdown pipeline renders one file at a time, so it cannot know that a figure in another file is "Figure 3". MyST's model needs the whole project.

## The theme stub

`myst build --site` is the mystmd command that writes the resolved AST of every page. It also expects the site's web theme, and downloads MyST's React theme into `_build/templates` if it is missing. An Astro site does not use that theme, so the loader places a minimal stub template in the generated project's `_build/templates` for the duration of each build and removes it afterwards. Builds therefore work offline and never download the React theme.
