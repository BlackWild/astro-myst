# Changelog

## 0.1.0 — 2026-10-14

Initial release.

- `mystLoader()`: Astro content loader that compiles a MyST project with `mystmd` (`myst build --site`) and stores rendered HTML, headings and typed page data per MyST page.
- Full MyST semantics from mystmd: numbering, cross-page references, citations, footnotes, KaTeX math with macros, proofs, admonitions, tabs, grids, cards, notebooks with outputs.
- URL rewriting that respects Astro `base`, `trailingSlash` and a configurable `routeBase`; assets copied to `public/<assetsDir>`.
- Offline builds (no download of MyST's React theme), build caching keyed on the MyST sources, live recompilation in `astro dev`.
- Custom node `handlers`, Shiki code highlighting, default stylesheet, KaTeX stylesheet, and the `XrefPreview` component for hover previews.
- Notebook cell visibility tags, large outputs stored as files, and the output format of mystmd < 1.7.
- Multi-project MyST sites (`project` option), `extraInputs` for files outside the project, references into external MyST sites.
- Lower-level `compileMystProject()`, `readMystBuild()` and `renderMystPage()` APIs.
