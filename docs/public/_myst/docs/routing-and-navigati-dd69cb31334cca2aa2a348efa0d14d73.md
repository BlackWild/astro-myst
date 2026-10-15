---
title: Routing and navigation
label: guide-routing
description: Map MyST pages to Astro routes and build sidebars, tables of contents and prev/next links.
---

astro-myst stores one entry per MyST page. You decide where the pages live in your site and how navigation looks; the entries carry everything needed for that.

## Routes

The usual setup is a rest parameter route that serves every page:

```astro
---
// src/pages/[...slug].astro
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const pages = await getCollection('docs');
  return pages.map((page) => ({ params: { slug: page.data.path || undefined }, props: { page } }));
}
---
```

`data.path` is the page's route path relative to where you mount the collection: `""` for the project index, `theory` for `theory.md`, and `part-1/intro` when MyST's [`site.options.folders`](https://mystmd.org/guide/website-navigation) is enabled.

### Mounting under a sub-path

To serve the pages below `/book/`, put the route at `src/pages/book/[...slug].astro` and tell the loader with `routeBase`, so cross-references and links point to the right URLs:

```ts
mystLoader({ root: './book', routeBase: '/book/' });
```

Astro's own [`base`](https://docs.astro.build/en/reference/configuration-reference/#base) and [`trailingSlash`](https://docs.astro.build/en/reference/configuration-reference/#trailingslash) settings are applied automatically; `data.url` is always the final URL of a page.

## Sidebar from the MyST table of contents

`data.order` is the position of the page in the `toc` of `myst.yml` (the index is `0`) and `data.level` its nesting depth, so a sidebar is a sort and a map:

```astro
---
import { getCollection } from 'astro:content';

const nav = (await getCollection('docs')).sort((a, b) => a.data.order - b.data.order);
const current = Astro.url.pathname;
---

<nav>
  <ul>
    {nav.map((p) => (
      <li style={`padding-left: ${p.data.level - 1}rem`}>
        <a href={p.data.url} aria-current={p.data.url === current ? 'page' : undefined}>
          {p.data.enumerator} {p.data.short_title ?? p.data.title}
        </a>
      </li>
    ))}
  </ul>
</nav>
```

`data.enumerator` is set when chapter numbering (`numbering.title: true`) is enabled, and `short_title` is MyST's frontmatter field for compact navigation labels.

## On this page

`render(entry)` returns the page's headings with MyST's ids and numbers:

```astro
---
const { Content, headings } = await render(page);
const toc = headings.filter((h) => h.depth === 2 || h.depth === 3);
---

<ul>{toc.map((h) => <li><a href={`#${h.slug}`}>{h.text}</a></li>)}</ul>
```

With heading numbering enabled, `text` includes the number, for example `2.1 Methods`.

## Previous and next

Use the same sorted list:

```astro
---
const i = nav.findIndex((p) => p.id === page.id);
const prev = nav[i - 1];
const next = nav[i + 1];
---
```

## Page metadata

The page title is not part of the rendered HTML, so you can place it (and the subtitle, authors, date or a thumbnail) wherever your layout wants. See [](#ref-entry-data) for every field, including `frontmatter` with the complete MyST frontmatter.
