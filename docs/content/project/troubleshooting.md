---
title: Troubleshooting
label: troubleshooting
description: Common errors and how to fix them.
---

`myst.yml has no site: section`
: Add `site: {}` to `myst.yml`. astro-myst runs `myst build --site`, which needs it.

`Could not run "myst"`
: Install mystmd in your project (`npm install mystmd`) or point the [`command`](#ref-loader-options) option to an existing executable.

`No myst.yml found`
: The loader's `root` is resolved relative to the Astro project root. Check the path.

Math looks unstyled
: Import `astro-myst/katex.css` in your layout.

Nothing is styled
: Import `astro-myst/styles.css` and wrap `<Content />` in an element with the class `myst`.

Numbers restart on every page
: That is MyST's default. Use `numbering.title: true` for chapter-style numbers or `numbering.figure.continue: true` (and the same for other kinds) for continuous numbering. See [MyST's numbering docs](https://mystmd.org/guide/cross-references#numbering).

A reference shows its label in red
: The target was not found. mystmd prints a warning with file and line in the Astro log. Check the label, and remember that labels are case-sensitive.

Links point to the wrong path
: Make sure `routeBase` matches where the route file lives, and that Astro's `base` is set when the site is served from a sub-path.

Images are missing after deploying
: Images are copied to `public/<assetsDir>` during the build. Do not exclude that folder from deployment (it is fine to exclude it from git).

DOI citations fail in CI
: The build machine cannot reach doi.org. Commit a `myst.doi.bib` ([](#guide-citations)).

Builds pick up stale content
: Delete `<root>/_build` and `node_modules/.astro`, or pass `cache: false`. If pages include files from outside the MyST project, list them in `extraInputs`.

Still stuck?
: [Open an issue](https://github.com/BlackWild/astro-myst/issues/new/choose) with the versions of Astro, mystmd and astro-myst and the warning from the log.
