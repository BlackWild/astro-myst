---
title: Building and deploying
label: guide-deployment
description: Build astro-myst sites in CI and deploy them to any static host.
---

An astro-myst site is a normal Astro site: `astro build` writes static files to `dist/` that any static host can serve. The MyST compilation happens inside the build, so there is no separate step to run.

## What the build needs

- Node.js (the version your Astro release requires) and your dependencies, including `mystmd` — `npm ci` installs everything.
- No network access, except for DOIs that are not in your `.bib` files (see [](#guide-citations)) and notebooks executed with `--execute`.
- Nothing else: astro-myst never downloads MyST's own web theme.

## Caching between builds

mystmd's build folder (`<root>/_build`) and Astro's data store (`node_modules/.astro`) make repeated builds fast: when no file in the MyST project changed, the loader reuses the previous mystmd output. In CI, caching these folders is optional; a full compile of a few dozen pages takes seconds.

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

For a project site such as `https://<user>.github.io/<repo>/`, set `site` and `base` in `astro.config.ts`; astro-myst uses `base` for every cross-reference, link and image. Enable Pages with **Settings → Pages → Source: GitHub Actions**. This documentation is deployed exactly this way.

## Netlify, Vercel, Cloudflare Pages

Use the framework preset for Astro (build command `npm run build`, output directory `dist`). Make sure the build image uses a supported Node.js version, for example with a `.node-version` file.

## Server rendering

The loader runs at build time (and in `astro dev`), so pages render the same with `output: 'server'` or an adapter. MyST's images and downloads are written to `public/`, which every adapter serves as static files.
