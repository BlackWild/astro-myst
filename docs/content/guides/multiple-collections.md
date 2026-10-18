---
title: Multiple collections
label: guide-multiple-collections
description: Several MyST collections side by side, shared MyST options, and links between collections and to other MyST sites.
---

Each `mystLoader()` compiles its folder as one MyST project. Numbering, cross-references and citations work between the pages of that collection, not across collections. Keep pages that reference each other's figures, equations or sections in one collection, and use separate collections for content that stands on its own, such as a blog and a book.

## Several collections side by side

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  blog: defineCollection({ loader: mystLoader({ base: './src/content/blog' }) }),
  book: defineCollection({
    loader: mystLoader({
      base: './src/content/book',
      toc: [{ file: 'index.md' }, { file: 'theory.md' }, { file: 'results.md' }],
      project: { numbering: { title: true } },
    }),
  }),
};
```

Each collection is served at `/<collection name>` unless you set `route`, so give each one a route file in the matching folder:

```text
src/pages/blog/[...slug].astro   → getCollection('blog'), pages at /blog/…
src/pages/book/[...slug].astro   → getCollection('book'), pages at /book/…
```

To serve the book at `/handbook` instead, move its route file to `src/pages/handbook/` and set `route: '/handbook'` (see [](#guide-routing)).

Collections are independent of each other:

- each has its own options: `base`, `pattern`, `toc`, `route`, `project`, `args` and the render settings ([](#ref-options));
- each is compiled as its own MyST project, generated in `<cacheDir>/astro-myst/<collection>/` ([](#how-it-works)), so in `astro dev` a change recompiles only the collection it belongs to;
- each has its own assets folder, served at `/_myst/<collection>/`, so collections never overwrite each other's files.

## Shared settings

Settings for every MyST collection go on the integration. Its `project` option takes anything the `project:` section of a `myst.yml` accepts. File paths in it, such as bibliographies and plugins, are relative to the Astro project root.

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

export default defineConfig({
  integrations: [
    myst({
      project: {
        abbreviations: { MyST: 'Markedly Structured Text' },
        math: { '\\dd': '\\mathrm{d}' },
      },
      numberedCitations: true,
    }),
  ],
});
```

A loader's own `project` is merged over the integration's one key at a time: a key that both set, such as `numbering`, takes the loader's value as a whole. The other options combine like this:

| Option | Integration | Loader |
| --- | --- | --- |
| `project` | shared by every collection | merged over it, key by key |
| `args` | flags for every collection | appended to the integration's |
| `codeThemes`, `numberedCitations` | default for every collection | replaces it |
| `handlers`, `labels` | default for every collection | merged; the loader's entries win |
| `command`, `styles` | integration only | — |

:::{note}
`.bib` files inside a collection's `base` are used automatically only while `project.bibliography` is not set. If you set `bibliography` on the integration, it applies to every collection and turns that discovery off, so list every bibliography you need.
:::

## Links between collections

Cross-references such as `@fig-setup` or `[](#sec-methods)` resolve only inside a collection. To link to a page of another collection, use an ordinary link to its URL:

```markdown
The derivation is in the [theory chapter](/book/theory) of the book.
```

astro-myst rewrites links between the pages of a collection, but leaves other URLs as you wrote them. Write the URL as the browser sees it, including Astro's `base` if your site has one. Do not link to the other collection's file (`../book/theory.md`): mystmd only knows the files of its own collection and turns a link to any other file into a download of that file.

In Astro components, take the URL from the entry instead of writing it by hand:

```astro
---
import { getEntry } from 'astro:content';
const theory = await getEntry('book', 'theory');
---
<a href={theory?.data.myst.url}>Theory</a>
```

## References to other MyST sites

MyST's [external references](https://mystmd.org/guide/external-references) link to labels in other MyST sites. List those sites under `references` in the project options:

```ts
mystLoader({
  base: './src/content/blog',
  project: { references: { guide: 'https://mystmd.org/guide' } },
});
```

Then reference their labels with `xref:` links, such as `[](xref:guide#some-label)`. mystmd fetches the other site's cross-reference index during the build, and the links point to that site. They are rendered as `a.myst-xref[data-xref-external]`.

astro-myst does not publish such an index for your own site, so external references work towards sites built with MyST's own tools, not between your collections.

## Files used by several collections

Files that pages read from outside their collection's `base`, such as a snippet `{include}`d by two collections or the repository's README, are watched in `astro dev` and part of the cache key only when you list them in `extraInputs` (relative to the Astro root):

```ts
mystLoader({ base: './src/content/book', extraInputs: ['src/shared', 'README.md'] });
```

Bibliographies and plugins set in `project` are watched automatically.

## Coming from multi-project MyST sites

astro-myst 0.1 could load one project of a multi-project `myst.yml` (`site.projects`) through the loader's `project` option. Both are gone in 0.2, along with `myst.yml` itself: define one collection per project, each with its own `base`, and move each project's settings into the loader's `project` and `toc` options.
