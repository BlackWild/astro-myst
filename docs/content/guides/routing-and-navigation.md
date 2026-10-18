---
title: Routing and navigation
label: guide-routing
description: Entry ids, where pages are served, and sidebars, prev/next links and on-page tables of contents built from entry data.
---

astro-myst stores one entry per file. You decide where the pages are served and what the navigation looks like; the entries carry what you need for both.

## Entry ids

Ids are made exactly like those of Astro's `glob()` loader: the file path relative to the loader's `base`, without extension, with every segment slugified and a trailing `/index` removed.

| File below `base` | `entry.id` |
|---|---|
| `index.md` | `index` |
| `methods.md` | `methods` |
| `chapter-1/index.md` | `chapter-1` |
| `Chapter 2/First Steps.ipynb` | `chapter-2/first-steps` |
| `appendix.tex` | `appendix` |

A `slug` in the frontmatter of a Markdown file replaces its id. For other schemes, pass a `generateId` function to the loader (see [](#ref-options-loader)). Two files with the same id are an error.

## Routes

Serve the pages with a rest parameter route. The root page of a collection has the id `index`; give it an empty `slug` so that it is served at the route's own path:

```astro
---
// src/pages/notes/[...slug].astro
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  return notes.map((note) => ({ params: { slug: note.id === 'index' ? undefined : note.id }, props: { note } }));
}

const { note } = Astro.props;
const { Content } = await render(note);
---
```

(guide-routing-route)=
### The `route` option

The loader writes the links between pages, the cross-references and `data.myst.url`, so it needs to know where you serve the pages. That is the `route` option. Its default, `/<collection name>`, matches a route file at `src/pages/<collection name>/[...slug].astro` like the one above. The `index` entry is served at the prefix itself, every other entry at the prefix plus its id.

| Route file | Loader option |
|---|---|
| `src/pages/notes/[...slug].astro` for the collection `notes` | none (the default, `/notes`) |
| `src/pages/[...slug].astro` | `route: '/'` |
| `src/pages/guide/v2/[...slug].astro` | `route: '/guide/v2'` |

When the URL of a page is not the prefix plus its id, pass a function from entry id to path instead. It receives every id, including `index`. For example, blog posts in year folders served without the year:

```ts
// src/content.config.ts: 2024/hello.md (id "2024/hello") is served at /blog/hello
mystLoader({ base: './src/content/blog', route: (id) => `/blog/${id.split('/').pop()}` });
```

```astro
---
// src/pages/blog/[slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.id.split('/').pop() }, props: { post } }));
}
---
```

`route` only tells the loader where the pages are; your route files decide. Keep the two in sync: if they disagree, the site still builds, but links between pages lead to the wrong URLs.

Astro's [`base`](https://docs.astro.build/en/reference/configuration-reference/#base) and [`trailingSlash`](https://docs.astro.build/en/reference/configuration-reference/#trailingslash) settings are applied on top of `route`. With `base: '/docs'`, the page `methods` of the collection `notes` has the URL `/docs/notes/methods`. Use `data.myst.url` for links instead of building URLs yourself.

## Navigation data

Every entry carries `data.myst`, computed by the loader:

| Field | Description |
|---|---|
| `url` | Final URL of the page: Astro's `base`, the `route` and the id |
| `order` | Position in the collection's table of contents, from `0` |
| `level` | Nesting level in the table of contents (`1` = top level) |
| `enumerator` | Page number such as `"2.1"`, when MyST's `numbering.title` is enabled |
| `kind` | `"Article"`, or `"Notebook"` for Jupyter notebooks |

### Sidebar

Sort the collection by `order` and indent by `level`. In the page above, where `note` is the current entry:

```astro
---
const nav = (await getCollection('notes')).sort((a, b) => a.data.myst.order - b.data.myst.order);
---

<nav>
  <ul>
    {nav.map((p) => (
      <li style={`padding-left: ${p.data.myst.level - 1}rem`}>
        <a href={p.data.myst.url} aria-current={p.id === note.id ? 'page' : undefined}>
          {p.data.myst.enumerator} {p.data.short_title ?? p.data.title}
        </a>
      </li>
    ))}
  </ul>
</nav>
```

`short_title` is MyST's frontmatter field for compact navigation labels.

### Previous and next

Pass the neighbours from `getStaticPaths()`:

```ts
export async function getStaticPaths() {
  const notes = (await getCollection('notes')).sort((a, b) => a.data.myst.order - b.data.myst.order);
  return notes.map((note, i) => ({
    params: { slug: note.id === 'index' ? undefined : note.id },
    props: { note, prev: notes[i - 1], next: notes[i + 1] },
  }));
}
```

(guide-routing-toc)=
## Order and nesting

Without further configuration, the `index` file comes first and the other files follow sorted by path, all at level 1. To choose the order and nest pages, give the loader a `toc` in the format of a [MyST table of contents](https://mystmd.org/guide/table-of-contents), with paths relative to `base`:

```ts
mystLoader({
  base: './src/content/book',
  toc: [
    { file: 'index.md' },
    { file: 'theory.md', children: [{ file: 'oscillator.md' }] },
    { title: 'Results', children: [{ pattern: 'results/*.md' }] },
    { file: 'appendix.md' },
  ],
});
```

- The first entry is the root page of the collection, usually `index.md`. MyST does not allow it to have children.
- `children` nest pages: `oscillator.md` gets level 2.
- An entry with a `title` and `children` but no `file` groups pages. The group is not an entry itself; its children get level 2.
- A `pattern` entry expands to the matching files in alphabetical order.
- Files that the loader's `pattern` matches but the `toc` does not list follow at the end, at level 1.

With `numbering.title: true` in the MyST project options, pages are numbered in this order, and `data.myst.enumerator` holds the number. See [](#sec-numbering).

Group titles are not entries, so they do not appear in `data`. To show them in a sidebar, keep them in your layout, or group the pages by the first segment of their id, as this site does.

## On this page

`render(entry)` returns the headings of a page with MyST's ids and numbers:

```astro
---
const { Content, headings } = await render(note);
const toc = headings.filter((h) => h.depth === 2 || h.depth === 3);
---

<ul>{toc.map((h) => <li><a href={`#${h.slug}`}>{h.text}</a></li>)}</ul>
```

`slug` is the heading's element id. With heading numbering enabled, `text` includes the number, for example `2.1 Methods`.

## Page metadata

The page title is not part of the rendered HTML, so you can place it, the subtitle, authors, date or thumbnail wherever your layout wants. See [](#ref-entry-data) for every field.
