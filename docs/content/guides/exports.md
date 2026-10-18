---
title: Exports
label: guide-exports
description: Offer your pages as PDF, Word, LaTeX, Markdown or JATS downloads, made by mystmd during the build.
---

mystmd can export pages to other formats: PDF, Word, LaTeX and more. With the `exports` option, astro-myst asks mystmd for these files during `astro build`, serves them next to the page's images, and lists them in each entry's `data.myst.exports`, so your layout can link to them.

## Turning exports on

Pass the formats to export every page in, on the integration for every collection or on a loader for one:

```ts
// astro.config.ts
myst({ exports: ['pdf', 'docx'] });
```

```ts
// src/content.config.ts
mystLoader({ base: './src/content/paper', exports: ['pdf', 'jats'] });
```

The array is short for `{ pages: [...] }`. The full form also exports the whole collection as one file, chooses templates and exports in `astro dev`:

```ts
mystLoader({
  base: './src/content/book',
  exports: {
    pages: ['pdf'], // one PDF per page
    collection: ['pdf'], // and one PDF of the whole book, in toc order
    templates: { pdf: 'plain_latex_book' }, // a MyST template per format
    dev: false, // the default: only `astro build` exports
  },
});
```

The loader's `exports` is merged over the integration's: each key it sets (`pages`, `collection`, `templates`, `dev`) replaces the integration's value for that key.

## Formats

| Format | File | Made with | Needs |
|---|---|---|---|
| `pdf` | `.pdf` | LaTeX | A TeX distribution with `latexmk` (TeX Live, MiKTeX), and a template download |
| `typst` | `.pdf` | [Typst](https://typst.app) | The `typst` CLI, and a template download |
| `tex` | `.zip` | | The LaTeX sources and figures, zipped; a template download |
| `docx` | `.docx` | | A template download |
| `md` | `.md` | | Nothing: works offline |
| `jats` | `.xml` | | Nothing: works offline. [JATS](https://jats.nlm.nih.gov) is the XML format of scholarly publishers. |

mystmd downloads the templates for `pdf`, `typst`, `tex` and `docx` from api.mystmd.org the first time it needs them and keeps them in the generated project's `_build/templates`, inside Astro's cache folder. Builds that export to these formats need network access, unless that folder is [cached between builds](#guide-deployment).

Only `pdf`, `typst` and `tex` can combine several pages into one file, so only they are allowed in `collection`.

## Download links

Each entry's `data.myst.exports` lists its files, then those of the whole collection:

| Field | Example | Description |
|---|---|---|
| `title` | `"PDF"`, `"Word"`, `"PDF (all pages)"` | A label for the link |
| `url` | `/_myst/paper/exports/pdf/methods.pdf` | Where the site serves the file |
| `filename` | `methods.pdf` | A file name for the `download` attribute: the source file's name, or the collection's name |
| `format` | `pdf` | The format, as in the option |
| `scope` | `page` | `page` for the page's own files, `collection` for the whole collection's |

```astro
---
// src/layouts/Article.astro
const { page } = Astro.props;
const files = page.data.myst.exports ?? [];
---

{files.length > 0 && (
  <p class="downloads">
    Download:
    {files.map((file) => <a href={file.url} download={file.filename}>{file.title}</a>)}
  </p>
)}
```

The files are published like images: under `<base>/_myst/<collection>/exports/<format>/<entry id>.<ext>`, served from Astro's cache folder in `astro dev` and copied into the build output by `astro build`. Collection exports are named after the collection, for example `exports/pdf/book.pdf`.

## Exports in `astro dev`

Making a PDF takes a few seconds, and `astro dev` recompiles the collection on every change. So, by default, only `astro build` exports, and in `astro dev` `data.myst.exports` is empty. Set `dev: true` to export in `astro dev` too, for example while you work on a template.

## Templates

A template decides the look of a PDF, the LaTeX class or the Word styles. `templates` takes, per format:

- the name of a template from [MyST's template gallery](https://github.com/myst-templates), such as `plain_latex_book` or `arxiv_two_column` for `pdf` and `tex`, or `lapreprint-typst` for `typst`;
- the URL of a template;
- a template folder in your project, relative to the Astro root, for example `templates/my-journal`. Its files are watched in `astro dev` and part of the cache key.

Without a template, mystmd uses its default for the format. Template options and the page's frontmatter (authors, affiliations, abstract, keywords) fill the template; see MyST's [documentation on exports](https://mystmd.org/guide/documents-exports).

## Exports in the frontmatter

MyST pages can declare exports themselves, with `exports:` in their frontmatter. When a declared export has a format that the `exports` option builds, mystmd makes it too, and the frontmatter `downloads` can reference it by its `id` ([](#ref-entry-data)). An `output` in such an export is refused: mystmd would write the file relative to the page, into your content folder. Remove the `output`, or rely on the `exports` option, which writes every file to the cache folder.

## When an export fails

mystmd's messages about an export (a missing `latexmk`, a template that cannot be downloaded) appear in the Astro log. If a requested file was not made, `astro build` fails with an `[astro-myst]` error naming the page and format; in `astro dev` it is a warning, and the link is left out.

The exporters are mystmd's, with their own limits. For example, the Markdown exporter skips nodes it cannot write, such as proofs and `{si}` units, and keeps image references that point to the original file names; the JATS exporter skips `{include}`. These are reported in the log, and the rest of the file is still made.
