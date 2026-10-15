---
title: Multiple projects
label: guide-multiple-projects
description: Several MyST projects in one Astro site, multi-project MyST sites, and files outside the project.
---

## One collection per MyST project

Each `mystLoader()` loads one MyST project. For several independent projects — say a user guide and a set of lecture notes — define one collection per project and mount each under its own path:

```ts
// src/content.config.ts
export const collections = {
  guide: defineCollection({ loader: mystLoader({ root: './guide', routeBase: '/guide/' }) }),
  lectures: defineCollection({ loader: mystLoader({ root: './lectures', routeBase: '/lectures/' }) }),
};
```

```text
src/pages/guide/[...slug].astro     → getCollection('guide')
src/pages/lectures/[...slug].astro  → getCollection('lectures')
```

Each collection copies its assets to its own folder (`public/_myst/<collection>`), so the projects never overwrite each other's files. Cross-references between separate projects are possible through MyST's [external references](https://mystmd.org/guide/external-references), which link to the other site's URLs.

## Multi-project MyST sites

A `myst.yml` can define several projects under `site.projects`. Load one of them per collection with the `project` option:

```ts
mystLoader({ root: './content', project: 'lectures', routeBase: '/lectures/' });
```

Without `project`, the first project is loaded and a warning lists the others.

## Files outside the project

The loader watches the MyST project folder and uses it as the cache key. If pages read files from elsewhere — for example `{include} ../README.md`, an `extends:` configuration or a shared bibliography — list them so that edits trigger a rebuild:

```ts
mystLoader({ root: './content', extraInputs: ['../README.md', '../shared/references.bib'] });
```

Paths are relative to the Astro project root and may be files or folders. This documentation uses it to include the changelog from the package folder.
