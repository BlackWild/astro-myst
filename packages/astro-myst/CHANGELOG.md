# Changelog

## 0.1.1

### Patch Changes

- [#4](https://github.com/BlackWild/astro-myst/pull/4) [`2603e38`](https://github.com/BlackWild/astro-myst/commit/2603e38964460507b92695937792dcf8efc7369c) Thanks [@BlackWild](https://github.com/BlackWild)! - First release published from GitHub Actions with provenance.

## 0.1.0 — 2026-10-14

Initial release.

- `mystLoader()`: Astro content loader that compiles a MyST project with `mystmd` (`myst build --site`) and stores rendered HTML, headings and typed page data per MyST page.
- Full MyST semantics from mystmd: numbering, cross-page references, citations, footnotes, KaTeX math with macros, proofs, admonitions, tabs, grids, cards, notebooks with outputs.
- URL rewriting that respects Astro `base`, `trailingSlash` and a configurable `routeBase`; assets copied to `public/<assetsDir>`.
- Offline builds (no download of MyST's React theme), build caching keyed on the MyST sources, live recompilation in `astro dev`.
- Custom node `handlers`, Shiki code highlighting, default stylesheet, KaTeX stylesheet, and the `XrefPreview` component for hover previews.
- Notebook cell visibility tags, large outputs stored as files, and the output format of mystmd < 1.7.
- Multi-project MyST sites (`project` option), `extraInputs` for files outside the project, references into external MyST sites.
- LaTeX (`.tex`) pages: document parts such as `\begin{abstract}` render as sections, and KaTeX's own line numbers are hidden so `align` blocks show MyST's single number.
- Numbered citations (`[1]`) via myst.yml `site.options.numbered_references` or the `numberedReferences` option.
- DOI citations: bibliography ids are derived safely from doi.org labels (`cite-doi-10.5281-zenodo.6476040`); `myst.doi.bib` written by `--doi-bib` is not treated as a source (no rebuild loop in dev).
- Empty frontmatter strings (e.g. a title made only of an unsupported macro) are treated as missing.
- Lower-level `compileMystProject()`, `readMystBuild()` and `renderMystPage()` APIs.
