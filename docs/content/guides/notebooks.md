---
title: Jupyter notebooks
label: guide-notebooks
description: Use .ipynb files as pages, with stored or freshly executed outputs.
---

Notebooks (`.ipynb`) are MyST pages: their Markdown cells support all MyST syntax and their outputs are rendered below the code.

```yaml
project:
  toc:
    - file: index.md
    - file: analysis.ipynb
```

## Outputs

By default the outputs stored in the notebook are used, so building needs no Python kernel. Rendered outputs include text and streams, errors, images (copied to `public/<assetsDir>`) and HTML such as dataframes. Large outputs that mystmd stores as separate files are read from the build folder.

To execute notebooks during the build, pass mystmd's `--execute` flag (Jupyter and the notebook's kernel must be installed where the build runs):

```ts
mystLoader({ root: './content', mystArgs: ['--execute'] });
```

## Cell tags

The usual tags work: `remove-cell`, `remove-input` and `remove-output` leave the content out of the page, and `hide-cell`, `hide-input` and `hide-output` put it in a collapsed `<details>` element.

## Labelling outputs

Label a cell (`#| label: fig-results` as the first line, or `label` in the cell metadata) to reference it, and use `{embed}` to show a cell's output on another page — see the [MyST notebook docs](https://mystmd.org/guide/reuse-jupyter-outputs).

## Interactivity

The MyST React theme can connect pages to a live Jupyter kernel. astro-myst renders notebooks statically; interactive widgets are not executed in the browser.
