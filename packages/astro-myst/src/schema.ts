import { z } from 'astro/zod';

const author = z
  .object({
    name: z.string().optional(),
    orcid: z.string().optional(),
    email: z.string().optional(),
    corresponding: z.boolean().optional(),
    affiliations: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());

/**
 * Data of a MyST entry: the page's frontmatter (keys MyST knows, such as `title`, `authors` or
 * `date`, as normalized by MyST; any other keys as written) plus `myst`, computed by the loader.
 * Extend it to type your own frontmatter:
 *
 * ```ts
 * schema: ({ image }) => mystSchema.extend({ draft: z.boolean().default(false), cover: image().optional() })
 * ```
 */
export const mystSchema = z
  .object({
    /** From the frontmatter, the first heading or LaTeX's `\title`; else the entry id. */
    title: z.string(),
    subtitle: z.string().optional(),
    short_title: z.string().optional(),
    description: z.string().optional(),
    date: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    authors: z.array(author).default([]),
    /** URL of the page thumbnail. */
    thumbnail: z.string().optional(),
    /** URL of the page banner. */
    banner: z.string().optional(),
    doi: z.string().optional(),
    myst: z.object({
      /** URL of the page (Astro `base` + the loader's `route` + entry id). */
      url: z.string(),
      /** Position in the collection's table of contents, from 0. */
      order: z.number(),
      /** Nesting level in the table of contents (1 = top level). */
      level: z.number(),
      /** Page number when `numbering.title` is enabled (e.g. "2.1"). */
      enumerator: z.string().optional(),
      /** `"Article"`, or `"Notebook"` for Jupyter notebooks. */
      kind: z.string(),
    }),
  })
  .catchall(z.unknown());

export type MystEntryData = z.infer<typeof mystSchema>;
