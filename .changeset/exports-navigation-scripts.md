---
'astro-myst': minor
---

**Exports, navigation helpers, optional browser scripts, and more of MyST rendered.**

- **Exports**: the new `exports` option (integration and loader) has mystmd export every page, or a whole collection, to PDF (LaTeX or Typst), Word, LaTeX sources, Markdown or JATS XML during `astro build` (in `astro dev` too with `dev: true`). The files are served like images and listed in `data.myst.exports` for download links: `exports: ['pdf', 'docx']` or `{ pages, collection, templates, dev }`. Exports declared in a page's frontmatter are built when their format is enabled; an `output` path in them, which would write next to your content, is refused.
- **Navigation**: `data.myst.parents` lists the toc groups and parent pages of each entry, and `mystNavigation(entries)` and `mystPrevNext(entries, current)` (from `astro-myst`) build a sidebar tree with group titles and previous/next links.
- **Browser scripts** (`scripts` option): tabs with the same `:sync:` key switch together (`syncTabs`, on by default), copy buttons on code blocks (`copyCode`), and Mermaid diagrams drawn in the browser (`mermaid`; install `mermaid`).
- Frontmatter parts such as `abstract:` are now rendered (the abstract before the content, other parts after it) and available as HTML in `data.myst.parts`.
- Frontmatter `downloads` are served and listed in `data.myst.downloads`.
- `{bibliography}` places the references where it stands; without it they still follow the page.
- `{si}` typesets compound units like siunitx (`9.81 m s⁻²` instead of mystmd's `9.81 mperssquared`); `{chem}` renders numbers as subscripts (`span.myst-chem`), `{eval}` results are `span.myst-eval`, `{toc}` renders as `nav.myst-toc` instead of a part with a "Toc:…" heading, and `{button}` keeps its `button` class on cross-references (plus `myst-button`, styled by the optional theme).
- The optional theme can hang margin notes in the page margin on wide screens (`myst-margin-column` class next to `myst`).
