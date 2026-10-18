---
title: Entry data
label: ref-entry-data
description: The id, data, body, file path, rendered HTML and headings stored for each MyST page, and how to type your own frontmatter.
---

Each file of a MyST collection becomes one entry. Entries work like those of Astro's `glob()` loader:

| Field | Description |
|---|---|
| `id` | Made from the file path like `glob()` does: `methods.md` → `methods`, `chapter-1/index.md` → `chapter-1`, the root `index.md` → `index`. A `slug` in the frontmatter of a Markdown file replaces it. See [](#guide-routing). |
| `data` | Your frontmatter, the keys MyST knows and `myst`, described below |
| `body` | The source without its frontmatter: the Markdown of a `.md` file, the full text of a `.tex` file, nothing for notebooks. Useful for a reading time or a search index. |
| `filePath` | The source file, relative to the Astro project root, for example `src/content/notes/methods.md` |
| `rendered` | The page's HTML (`rendered.html`) and metadata, used by `render(entry)` |

## `entry.data`

`data` combines three kinds of keys.

### Frontmatter as written

Every key of a Markdown file's frontmatter is in `data` as you wrote it, including keys that MyST does not know, such as `pubDate`, `draft`, `heroImage` or `section` (mystmd itself drops those). YAML is parsed as Astro parses Markdown frontmatter, so a date such as `2024-05-01` becomes a `Date`. Type your keys by [extending the schema](#ref-entry-data-schema).

The keys in the next table are the exception: they hold MyST's normalized values. Notebooks and LaTeX files only have those.

### Keys normalized by MyST

mystmd validates and normalizes the frontmatter. These keys hold MyST's values, even where you wrote them differently (for example `authors: Jane Doe` becomes a list with one author):

| Field | Type | Description |
|---|---|---|
| `title` | `string` | The frontmatter `title`, else the first heading, else LaTeX's `\title`, else the entry id |
| `subtitle` | `string?` | |
| `short_title` | `string?` | A shorter title, meant for navigation |
| `description` | `string?` | |
| `date` | `Date?` | |
| `tags`, `keywords` | `string[]?` | |
| `authors` | `Author[]` | `{ name, orcid?, email?, corresponding?, affiliations? }` plus MyST's other author fields. `affiliations` lists names: MyST's affiliation ids are resolved. Default: `[]`. |
| `thumbnail` | `string?` | Public URL of the page thumbnail |
| `banner` | `string?` | Public URL of the page banner |
| `doi` | `string?` | |

Some keys of the MyST project options are inherited by every page that does not set its own, as in MyST: for example `authors`, `date`, `license` and `numbering` (see [](#ref-options-project)).

### `myst`

Computed by the loader:

| Field | Type | Description |
|---|---|---|
| `myst.url` | `string` | URL of the page: Astro's `base`, the loader's `route` and the entry id, with `trailingSlash` applied |
| `myst.order` | `number` | Position in the collection's table of contents, from `0` |
| `myst.level` | `number` | Nesting level in the table of contents (`1` = top level) |
| `myst.enumerator` | `string?` | Page number such as `"2.1"`, when `numbering.title` is enabled |
| `myst.kind` | `string` | `"Article"`, or `"Notebook"` for Jupyter notebooks |
| `myst.parents` | `{ title, id? }[]` | The toc groups and parent pages that contain the page, outermost first: `{ title }` for a group (a toc entry with a `title` but no `file`), `{ title, id }` for a parent page. `[]` at the top level. |
| `myst.parts` | `Record<string, string>?` | HTML of each [part](#guide-writing-parts) given in the frontmatter, such as `abstract` or `acknowledgments`, keyed by part name |
| `myst.downloads` | `Download[]?` | The files listed in the frontmatter `downloads`, as `{ title, url, filename?, format? }`, with `url` where the site serves the file |
| `myst.exports` | `Export[]?` | Files exported with the [`exports` option](#guide-exports): `{ title, url, filename, format, scope }`, this page's files (`scope: 'page'`) and then the whole collection's (`scope: 'collection'`) |

See [](#guide-routing) for sidebars, breadcrumbs and prev/next links built from these fields, and [](#guide-exports) for download links.

(ref-entry-data-parts)=
### Frontmatter parts

Parts written in the frontmatter, such as `abstract: …`, are part of the page's HTML too, as in MyST's themes: `abstract`, `summary` and `keypoints` come before the content, the other parts (`acknowledgments`, `data_availability`, …) after it, before the footnotes and the bibliography. Each one is a `section.myst-part` with a heading, like parts written in the body. `myst.parts` holds the same HTML, for example to show the abstract in a list of posts:

```astro
{post.data.myst.parts?.abstract && <Fragment set:html={post.data.myst.parts.abstract} />}
```

### Downloads

mystmd resolves the frontmatter `downloads`: files are copied with the page's images, and exports referenced by their `id` become files. The raw value stays in `data.downloads` as you wrote it; use `myst.downloads` for links:

```yaml
downloads:
  - file: data/results.csv
    title: Results
  - url: https://doi.org/10.5281/zenodo.1234
    title: Dataset on Zenodo
```

```astro
<ul>
  {post.data.myst.downloads?.map((file) => <li><a href={file.url} download={file.filename}>{file.title}</a></li>)}
</ul>
```

## `render(entry)`

```ts
import { render } from 'astro:content';

const { Content, headings, remarkPluginFrontmatter } = await render(entry);
```

- `Content` renders the page body. The title is not part of it, so place it in your layout. [Frontmatter parts](#ref-entry-data-parts) are included; footnotes and the bibliography are appended to the body, unless a `{bibliography}` directive places the references.
- `headings` lists the headings as `{ depth, slug, text }`. `slug` is the heading's element id, and `text` includes the section number when heading numbering is enabled, for example `1.2 Methods`.
- `remarkPluginFrontmatter` is the page's complete frontmatter as normalized by MyST (numbering, math macros, license, exports, …), including the keys inherited from the project options. Keys that MyST does not know are not in it.

`entry.rendered?.html` holds the same HTML as a string, for example for a feed or a search index.

(ref-entry-data-schema)=
## Typing your own frontmatter

The loader's default schema is `mystSchema`, exported from `astro-myst/loaders`. It types the MyST keys and `myst`, and lets any other key through untyped. To type your own keys, extend it in the collection's `schema`:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { mystLoader, mystSchema } from 'astro-myst/loaders';

const blog = defineCollection({
  loader: mystLoader({ base: './src/content/blog' }),
  schema: ({ image }) =>
    mystSchema.extend({
      pubDate: z.coerce.date(),
      draft: z.boolean().default(false),
      heroImage: image().optional(),
    }),
});

export const collections = { blog };
```

Start from `mystSchema`: a collection's `schema` replaces the loader's, and a plain `z.object()` would drop `myst` and the MyST keys.

Then `post.data.pubDate` is a `Date` and `post.data.draft` a `boolean`, and you can filter on them:

```ts
import { getCollection } from 'astro:content';

const posts = await getCollection('blog', ({ data }) => !data.draft);
```

`image()` works for your own keys, whose values are paths relative to the file, as in Astro's Markdown. It does not work for `thumbnail` and `banner`: MyST resolves those to URLs itself.

## Types

```ts
import type { CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'blog'>; // Post['data'] follows the collection's schema
```

`MystEntryData`, exported from `astro-myst` and `astro-myst/loaders`, is the type of `data` with the default schema.
