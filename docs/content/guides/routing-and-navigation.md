---
title: Routing and navigation
label: guide-routing
description: Entry ids, where pages are served, and sidebars, breadcrumbs, prev/next links and on-page tables of contents built from entry data.
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
| `parents` | The toc groups and parent pages containing the page, outermost first: `{ title }` for a group, `{ title, id }` for a page |

`astro-myst` exports two helpers that build navigation from these fields. They work on the entries of any MyST collection, including a filtered list.

### Sidebar

`mystNavigation(entries)` returns the table of contents as a tree, in toc order: pages nested under their parent pages, and pages of a toc group under an item with the group's title. Each item has a `title` (the page's `short_title`, else its `title`, or the group's title), the `entry` and its `url` (both missing for groups), its `level` and its `children`. In the page above, where `note` is the current entry:

```astro
---
// src/components/TocList.astro: renders itself for nested items
import type { MystNavItem } from 'astro-myst';

interface Props {
  items: MystNavItem[];
  current: string;
}
const { items, current } = Astro.props;
---

<ul>
  {items.map((item) => (
    <li>
      {item.url ? (
        <a href={item.url} aria-current={item.entry?.id === current ? 'page' : undefined}>{item.title}</a>
      ) : (
        <span class="group">{item.title}</span>
      )}
      {item.children.length > 0 && <Astro.self items={item.children} current={current} />}
    </li>
  ))}
</ul>
```

```astro
---
// in the layout
import { mystNavigation } from 'astro-myst';
import TocList from '../components/TocList.astro';

const tree = mystNavigation(await getCollection('notes'));
---

<nav><TocList items={tree} current={note.id} /></nav>
```

If you filter entries out (drafts, for example), their child pages stay in the tree, under an item with the parent's title and no link. `short_title` is MyST's frontmatter field for compact navigation labels; add `item.entry?.data.myst.enumerator` for chapter numbers.

For a flat list, sort the collection by `order` and indent by `level` instead:

```astro
{nav.map((p) => <li style={`padding-left: ${p.data.myst.level - 1}rem`}><a href={p.data.myst.url}>{p.data.title}</a></li>)}
```

### Breadcrumbs

`data.myst.parents` lists the groups and pages above the current one:

```astro
---
const notes = await getCollection('notes');
const urlOf = (id: string) => notes.find((n) => n.id === id)?.data.myst.url;
---

<nav aria-label="Breadcrumbs">
  {note.data.myst.parents.map((parent) =>
    parent.id ? <a href={urlOf(parent.id)}>{parent.title}</a> : <span>{parent.title}</span>,
  )}
</nav>
```

### Previous and next

`mystPrevNext(entries, current)` returns the pages before and after the current entry (or entry id) in toc order:

```ts
import { mystPrevNext } from 'astro-myst';

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  return notes.map((note) => ({
    params: { slug: note.id === 'index' ? undefined : note.id },
    props: { note, ...mystPrevNext(notes, note) },
  }));
}
```

`prev` is missing on the first page and `next` on the last one.

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
- An entry with a `title` and `children` but no `file` groups pages. The group is not an entry itself; its children get level 2 and the group in `data.myst.parents`, and `mystNavigation()` shows it as an item without a link.
- A `pattern` entry expands to the matching files in alphabetical order.
- Files that the loader's `pattern` matches but the `toc` does not list follow at the end, at level 1.

With `numbering.title: true` in the MyST project options, pages are numbered in this order, and `data.myst.enumerator` holds the number. See [](#sec-numbering).

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
