---
title: Troubleshooting
label: troubleshooting
description: Common errors and how to fix them.
---

`mystLoader() needs the astro-myst integration`
: Add the integration to `astro.config.ts`: `import myst from 'astro-myst'` and `integrations: [myst()]`. The loader reads its options and relies on it to serve and copy images.

`The content folder … does not exist`
: The loader's `base` is relative to the Astro project root (the folder with `astro.config.ts`), not to `src/content.config.ts`. For the folder `src/content/blog/`, write `base: './src/content/blog'`.

`Could not run "myst"`
: astro-myst found neither the `mystmd` npm package nor a `myst` executable on the `PATH`. Install it in your project (`npm install mystmd`), or point the integration's [`command`](#ref-options) option to an existing executable such as `jupyter-book`. The same message with another name means the `command` you set cannot be run.

`… both have the entry id "…"`
: Two files map to the same entry id, for example `intro.md` and `intro.ipynb`, `guide.md` and `guide/index.md`, or two files with the same frontmatter `slug`. Rename one of them, give one a different `slug`, or pass `generateId` to the loader.

Upgrading from 0.1
: astro-myst 0.2 reads no `myst.yml`, needs the integration, and exports the loader from `astro-myst/loaders`. Errors about a missing `mystLoader` export, a missing `base` option or `data.path` come from code written for 0.1; follow *Upgrading from 0.1* in [](#getting-started) and the [migration table](#ref-options-migration).

Links between pages lead to 404s
: The loader's `route` must match where your route file serves the collection. It defaults to `/<collection name>`, which fits `src/pages/<collection name>/[...slug].astro`; for `src/pages/[...slug].astro`, set `route: '/'` ([](#guide-routing)). When the site is served from a sub-path, set Astro's `base`; astro-myst adds it to every link.

Images return 404s
: MyST's images and downloads are served from `<base>/_myst/<collection>/`: by the integration in `astro dev`, and from the build output after `astro build` (`dist/_myst/`, or `dist/client/_myst/` with server output). Check that Astro's `base` matches where the site is served, and that your deployment keeps folders whose names start with `_` ([](#guide-deployment)).

Math looks unstyled
: With `styles: false`, the integration adds no CSS. Import `astro-myst/katex.css` (and `astro-myst/base.css`) in your layout yourself ([](#guide-styling)).

Admonitions, cards and figures look plain
: The default `styles: 'base'` contains only what MyST content needs to work, such as tabs, equation numbers and code colours. Set `styles: 'theme'` for a ready-made look, or style the `myst-*` classes yourself ([](#guide-styling)). The theme styles plain elements such as headings and tables only inside an element with the class `myst`.

Numbers restart on every page
: That is MyST's default. Use `numbering: { title: true }` for chapter-style numbers, or `numbering: { figure: { continue: true } }` (and the same for other kinds) for continuous numbering, in the integration's or loader's `project` option or in a page's frontmatter. See [MyST's numbering docs](https://mystmd.org/guide/cross-references#numbering).

A reference is not a link
: The target was not found, and the reference renders as `span.myst-xref-unresolved`. mystmd prints a warning with file and line in the Astro log. Check the label (labels are case-sensitive), and remember that references resolve only within a collection ([](#guide-multiple-collections)).

A frontmatter key is missing or untyped
: Your own keys are in `entry.data` as written, for example `post.data.draft`, typed as `unknown` until you add them to the collection's schema: `schema: mystSchema.extend({ draft: z.boolean().default(false) })` ([](#ref-entry-data)). Keys MyST knows, such as `date`, `authors` or `thumbnail`, hold MyST's normalized values. In notebooks and LaTeX files, only the keys MyST knows are available.

DOI citations fail in CI
: The build machine cannot reach doi.org. Add the entries to a `.bib` file in the collection's folder or in `project.bibliography` ([](#guide-citations)), or cache `node_modules/.astro` between builds, where mystmd keeps the metadata it downloaded ([](#guide-deployment)).

Changes are not picked up, or the output is stale
: Force a fresh compile with the `--force` flag of `astro dev`, `astro build` or `astro sync` (it clears Astro's content layer cache), by deleting `node_modules/.astro/astro-myst`, or with `cache: false` on the loader. If pages include files from outside `base`, list them in `extraInputs` so that changes to them are noticed. After upgrading mystmd outside npm (a `myst` from pip or conda, or any `command`), force one fresh compile: the cache knows only the executable's name, not its version.

Still stuck?
: [Open an issue](https://github.com/BlackWild/astro-myst/issues/new/choose) with the versions of Astro, mystmd and astro-myst and the warning from the log.
