---
title: Entry data
label: ref-entry-data
description: The data, rendered HTML and headings stored for each MyST page.
---

Each page of the MyST project becomes one entry of the collection. Its `id` is MyST's page slug (`index`, `theory`, or `part-1.intro` with folder URLs).

## `entry.data`

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Page title (frontmatter, `\title`, or the first heading) |
| `subtitle` | `string?` | Frontmatter `subtitle` |
| `short_title` | `string?` | Frontmatter `short_title`, meant for navigation |
| `description` | `string?` | Frontmatter `description` |
| `enumerator` | `string?` | The page number when `numbering.title` is enabled, e.g. `"2.1"` |
| `date` | `string?` | Frontmatter `date` |
| `tags`, `keywords` | `string[]?` | Frontmatter `tags` and `keywords` |
| `authors` | `Author[]` | `{ name, affiliations: string[], orcid?, email?, corresponding?, … }`; affiliation ids are resolved to names |
| `thumbnail` | `string?` | Public URL of the page thumbnail |
| `path` | `string` | Route path relative to `routeBase`; `""` for the index. Use it as the `[...slug]` parameter |
| `url` | `string` | Final URL of the page, including Astro's `base` and `routeBase` |
| `order` | `number` | Position in the MyST table of contents (the index is `0`) |
| `level` | `number` | Nesting level in the table of contents (`1` = top level) |
| `isIndex` | `boolean` | Whether this is the project's index page |
| `kind` | `string` | `"Article"` or `"Notebook"` |
| `source` | `string` | Source file, relative to the MyST project root |
| `projectTitle` | `string?` | Title of the MyST project |
| `frontmatter` | `object` | The complete, validated MyST frontmatter (numbering, math macros, license, exports, …) |

Frontmatter set in `myst.yml` under `project:` is inherited by every page, as in MyST.

## `render(entry)`

```ts
const { Content, headings } = await render(entry);
```

- `Content` renders the page body. The title is not part of it, so place it in your layout.
- `headings` lists every heading as `{ depth, slug, text }`. `slug` is MyST's element id, and `text` includes the section number when heading numbering is enabled.

Footnotes and the bibliography are appended to the page body as `section.footnotes` and `section.bibliography`.

## Types

```ts
import type { CollectionEntry } from 'astro:content';
import type { MystPageData } from 'astro-myst';

type Page = CollectionEntry<'docs'>; // page.data is MystPageData
```
