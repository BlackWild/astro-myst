---
title: Getting started
label: getting-started
description: Install astro-myst, add the integration and a MyST collection, and render its pages.
---

This guide adds a collection of MyST pages to an Astro site in five steps. The [minimal example](https://github.com/BlackWild/astro-myst/tree/main/examples/minimal) is the same setup, served at the site root.

## Requirements

- Astro 5, 6 or 7, with Node.js 22.12 or newer
- `mystmd` 1.3 or newer — installed from npm below, or an existing `myst` / `jupyter-book` executable (see the integration's [`command`](#ref-options-integration) option)

## 1. Install

```sh
npm install astro-myst mystmd
```

`mystmd` is the MyST compiler. It is a peer dependency, so you choose and pin its version.

## 2. Add the integration

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

export default defineConfig({
  integrations: [myst()],
});
```

The integration holds the options shared by all MyST collections (numbering, math macros, citations, styles; see [](#ref-options)), adds the stylesheets to every page, serves the images of your pages in `astro dev` and copies them into the build output. The loader needs it: without it, `mystLoader()` fails with a message telling you to add it.

## 3. Write some pages

Create a folder for the collection, for example `src/content/notes/`. There is no `myst.yml`: every Markdown file and notebook in the folder becomes a page.

`src/content/notes/index.md`:

```markdown
---
title: Introduction
---

We measure the decay described by @eq-decay on the [methods page](./methods.md).
```

`src/content/notes/methods.md`:

````markdown
---
title: Methods
---

```{math}
:label: eq-decay
N(t) = N_0 e^{-\lambda t}
```
````

The files are compiled together, so the reference in `index.md` finds the equation in `methods.md`, and the link to `./methods.md` becomes a link to the methods page.

## 4. Define a collection

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  notes: defineCollection({ loader: mystLoader({ base: './src/content/notes' }) }),
};
```

`base` is the folder of the collection, as for Astro's `glob()` loader. Each file becomes one entry:

- `id` is derived from the file path like `glob()` does: `index` and `methods` here.
- `data` holds your frontmatter, the keys MyST knows (`title`, `authors`, `date`, …) as MyST normalizes them, and `myst` with the page's URL and position in the table of contents. See [](#ref-entry-data).

## 5. Render the pages

```astro
---
// src/pages/notes/[...slug].astro
import { getCollection, render } from 'astro:content';
import XrefPreview from 'astro-myst/XrefPreview.astro';

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  return notes.map((note) => ({ params: { slug: note.id === 'index' ? undefined : note.id }, props: { note } }));
}

const { note } = Astro.props;
const { Content } = await render(note);
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{note.data.title}</title>
  </head>
  <body>
    <article>
      <h1>{note.data.title}</h1>
      <Content />
    </article>
    <XrefPreview />
  </body>
</html>
```

- The `index` entry gets an empty `slug`, so it is served at `/notes` and `methods` at `/notes/methods`.
- That is where the loader expects the pages by default: its `route` option defaults to `/<collection name>`. Links between pages and cross-references point there. If you serve the pages somewhere else, for example at the site root, set `route` (see [](#guide-routing)).
- The title is not part of `<Content />`, so your layout places it.
- `XrefPreview` is optional: it shows the target of a cross-reference or citation when you hover or focus it.

Run `npm run dev` and open `/notes`. The loader compiles the collection with mystmd, and recompiles it whenever a file in `src/content/notes/` changes; numbers and references update on every page.

mystmd's build output lives in Astro's cache folder (`node_modules/.astro/astro-myst/<collection>/` by default). Nothing is written next to your content or into `public/`, so there is nothing to add to `.gitignore`.

## Styles

You do not import any CSS. The integration adds two stylesheets to every page: KaTeX's styles for math, and the few rules MyST content needs to work (equation numbers, tabs, code colours in dark mode, …). These rules have zero specificity, so your own CSS, Tailwind utilities and `prose` always win.

For a complete look, switch on the optional theme:

```ts
myst({ styles: 'theme' });
```

The theme styles MyST's components (admonitions, figures, code blocks, cross-references, …) wherever they appear, and plain elements such as headings and tables only inside an element with the class `myst`, for example `<article class="myst">`. See [](#guide-styling).

## Upgrading from 0.1

astro-myst 0.2 no longer reads a `myst.yml`. To upgrade:

1. Add `myst()` to the integrations in `astro.config`, import `mystLoader` from `astro-myst/loaders`, and replace its `root` option with `base`.
2. Move the `project:` settings of your `myst.yml` into the `project` option of the integration or the loader, and its `toc` into the loader's `toc` option. Then delete `myst.yml`.
3. Pages are served at `/<collection name>` by default: set `route: '/'` to keep them at the site root. Use `entry.id` (`'index'` for the root page) instead of `data.path`, and `data.myst.url`, `data.myst.order`, … instead of `data.url`, `data.order`, ….
4. Remove the imports of `astro-myst/styles.css` and `astro-myst/katex.css` (the integration adds the styles), the `.gitignore` entries for `_build/` and `public/_myst/`, and those folders. If your CSS targets astro-myst's classes, add the new `myst-` prefix (`xref` is now `myst-xref`).

The [migration table](#ref-options-migration) lists every renamed and removed option and field.

## Next

- [](#guide-routing) — routes, sidebars, tables of contents and prev/next links
- [](#guide-styling) — theming the output
- [](#guide-deployment) — building in CI and deploying
