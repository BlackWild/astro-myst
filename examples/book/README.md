# astro-myst example: a small book

A multi-page "book" with a sidebar, an "on this page" outline, previous/next links and hover previews.

`content/` is an ordinary MyST project:

- Markdown pages with chapter numbering (`numbering.title`), numbered sections, figures and sub-figures, equations, a theorem and a code listing
- a LaTeX page (`derivation.tex`) that cross-references the Markdown pages and vice versa
- a Jupyter notebook with stored outputs
- BibTeX and DOI citations, an appendix with its own `A1`-style numbering

`src/content.config.ts` loads it with `mystLoader`, and `src/pages/[...slug].astro` + `src/layouts/BookLayout.astro` render it.

```sh
# from the repository root
npm install
npm run build
npm run dev -w astro-myst-example-book
```

Things to try: hover any blue reference; add an equation above the first one in `content/theory.md` and watch the equation numbers update on every page; set `numbering.title: false` in `content/myst.yml`.
