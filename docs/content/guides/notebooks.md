---
title: Jupyter notebooks
label: guide-notebooks
description: Use .ipynb files as pages, with stored or freshly executed outputs.
---

Notebooks (`.ipynb`) are MyST pages: their Markdown cells support all MyST syntax and their outputs are rendered below the code. The loader's default `pattern` (`**/[^_]*.{md,ipynb}`) includes them, so a notebook in the collection folder becomes an entry like a Markdown file. To choose its place in the table of contents, list it in `toc`:

```ts
mystLoader({
  base: './src/content/book',
  toc: [{ file: 'index.md' }, { file: 'analysis.ipynb' }],
});
```

A notebook entry has `data.myst.kind` set to `"Notebook"` and no `body`. Only the frontmatter keys MyST knows reach its `data`; keys of your own are kept for Markdown files only.

## Outputs

By default the outputs stored in the notebook are used, so building needs no Python kernel. Rendered outputs include text and streams, errors, images (served from `/_myst/<collection>/` like other images) and HTML such as dataframes. Large outputs that mystmd stores as separate files are read from its build folder.

## Executing notebooks

To execute notebooks during the build, pass mystmd's `--execute` flag in `args`, on the integration for every collection or on a loader for one:

```ts
// astro.config.ts
myst({ args: ['--execute'] });
```

```ts
// src/content.config.ts
mystLoader({ base: './src/content/book', args: ['--execute'] });
```

Jupyter and the notebook's kernel must be installed where the build runs; for Python, `pip install jupyter-server ipykernel` and the packages your notebooks import. Markdown pages with `{code-cell}` blocks are executed too, if their frontmatter declares a `kernelspec`. mystmd keeps execution results in its build folder in Astro's cache folder, so notebooks whose code did not change are not run again; see [](#guide-deployment) for caching that folder in CI.

mystmd starts a Jupyter server whose root is the project folder, and Jupyter refuses to run files outside its root. So, when a collection has something to execute, the generated project reaches the collection's folder through a link, `node_modules/.astro/astro-myst/<collection>/source` (a symbolic link, or a junction on Windows), and mystmd reads every page of the collection through it. Nothing is written into your content folder. One consequence: while executing, paths that leave the collection's folder, such as `{include} ../../README.md` or an image in a sibling folder, do not resolve; keep what executed collections use inside their `base` folder, or move `base` up to a folder that contains it.

## Cell tags

The usual tags work: `remove-cell`, `remove-input` and `remove-output` leave the content out of the page, and `hide-cell`, `hide-input` and `hide-output` put it in a collapsed `details.myst-hidden` element, with a summary such as "Show code".

## Labelling outputs

Label a cell (`#| label: fig-results` as the first line, or `label` in the cell metadata) to reference it, and use `{embed}` to show a cell's output on another page — see the [MyST notebook docs](https://mystmd.org/guide/reuse-jupyter-outputs).

## Interactivity

The MyST React theme can connect pages to a live Jupyter kernel. astro-myst renders notebooks statically; interactive widgets are not executed in the browser.
