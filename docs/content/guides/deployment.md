---
title: Building and deploying
label: guide-deployment
description: Build astro-myst sites in CI and deploy them to any static host or with an adapter.
---

An astro-myst site is a normal Astro site. `astro build` compiles the MyST collections and writes the pages, so there is no separate step to run.

## What the build writes

MyST pages become ordinary pages in the build output. The images, videos and downloads they use are copied to `_myst/<collection>/` in the output, for example `dist/_myst/blog/`, and the pages link to them there.

Nothing is written next to your content or into `public/`. The generated MyST projects live in Astro's cache folder inside `node_modules/`, so astro-myst needs no `.gitignore` entries.

## Server output and adapters

The integration copies the assets in Astro's `astro:build:generated` hook: after the pages are written, and before adapters package the output in `astro:build:done`. With `output: 'server'` or an adapter (Node, Netlify, Vercel, Cloudflare, …) they go to the client folder (`dist/client/` by default), which the adapter serves as static files.

Entries are loaded at build time (and in `astro dev`), so pages rendered on demand use the same entries, and mystmd never runs on the server.

## What the build needs

- Node.js and your dependencies, including `mystmd`. `npm ci` installs everything.
- No network access, except for DOIs that are not in your `.bib` files ([](#guide-citations)), [external references](#guide-multiple-collections) to other MyST sites, and whatever executed notebooks download.
- Nothing else: astro-myst never downloads MyST's own web theme.

(guide-deployment-mystmd)=
### mystmd from pip or conda

astro-myst runs the `mystmd` npm package when it is installed, and otherwise the `myst` executable on the `PATH`. To choose the executable explicitly, for example `myst` from a Python environment or `jupyter-book`, set the integration's `command` option:

```ts
// astro.config.ts
export default defineConfig({
  integrations: [myst({ command: 'myst' })],
});
```

The executable must be installed where the build runs, for example with `pip install mystmd` after `actions/setup-python` in GitHub Actions.

### Executing notebooks

Flags in `args` are passed to `myst build`. With `--execute`, mystmd runs the notebooks during the build:

```ts
myst({ args: ['--execute'] });
```

The build machine then needs Python, Jupyter Server and the notebooks' kernel and packages:

```yaml
- uses: actions/setup-python@v7
  with:
    python-version: '3.13'
- run: pip install jupyter-server ipykernel # and the packages your notebooks import
```

See [](#guide-notebooks).

## Caching between builds

The generated MyST projects, including mystmd's `_build/` folders, live in Astro's cache folder: `node_modules/.astro/astro-myst/<collection>/` by default (Astro's `cacheDir` option). The loader keeps a fingerprint of its inputs in Astro's data store, which `astro build` also writes to that folder. When no input changed since the last build, the previous mystmd output is reused and only rendering runs.

In CI, a fresh checkout gives every file a new modification time, so mystmd compiles the collections again. Caching `node_modules/.astro` still speeds up builds, because mystmd reuses what it keeps in `_build/`: the metadata it downloaded for DOIs and, with `--execute`, the outputs of notebooks whose code did not change. Restore the cache after `npm ci`, which deletes `node_modules`:

```yaml
- run: npm ci
- uses: actions/cache@v6
  with:
    path: node_modules/.astro
    key: astro-${{ github.sha }}
    restore-keys: astro-
- run: npm run build
```

For a few dozen pages without DOIs or executed notebooks the cache is optional: a full compile takes seconds.

## GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - uses: actions/cache@v6
        with:
          path: node_modules/.astro
          key: astro-${{ github.sha }}
          restore-keys: astro-
      - run: npm run build
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

For a project site such as `https://<user>.github.io/<repo>/`, set `site` and `base` in `astro.config.ts`. astro-myst adds `base` to every page link, cross-reference and asset URL, so assets are served from `<base>/_myst/<collection>/`. Enable Pages with **Settings → Pages → Source: GitHub Actions**. This documentation is deployed this way.

:::{tip}
The workflow above uploads `dist/` as it is. If you instead push `dist/` to a branch that GitHub Pages builds with Jekyll, add an empty `public/.nojekyll` file: Jekyll leaves out folders whose names start with `_`, such as `_astro/` and `_myst/`.
:::

## Netlify, Vercel, Cloudflare Pages

Use the framework preset for Astro (build command `npm run build`, output directory `dist`). Make sure the build image uses a supported Node.js version, for example with a `.node-version` file. If mystmd is not an npm dependency of your site, install it there too ([](#guide-deployment-mystmd)).
