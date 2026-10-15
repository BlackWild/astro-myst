# astro-myst example: a small book

`content/` is an ordinary MyST project (`myst.yml`, Markdown pages, a LaTeX page `derivation.tex`, a notebook, a BibTeX file). `src/content.config.ts` loads it with `mystLoader`, and `src/pages/[...slug].astro` + `src/layouts/BookLayout.astro` render it with a sidebar, an "on this page" outline, prev/next links and hover previews.

```sh
npm install        # from the repository root
npm run example:dev
```

Things to try: hover any blue reference, edit `content/theory.md` (add an equation above the first one) and watch the equation numbers update on every page, or set `numbering.title: false` in `content/myst.yml`.
