---
title: Citations and DOIs
label: guide-citations
description: Cite BibTeX entries or bare DOIs and get a bibliography on every page.
---

Citations are resolved by mystmd before astro-myst renders a page, so every MyST citation syntax works [@knuth1984]. Each page gets a bibliography of what it cites, and every citation links to its entry (with a hover preview when you use `XrefPreview`).

## BibTeX

Put `.bib` files anywhere in the collection folder and cite their keys. The loader finds them automatically:

```text
src/content/blog/
├── references.bib
├── first-post.md
└── second-post.md
```

```markdown
Narrative: @knuth1984 or {cite:t}`knuth1984`.
Parenthetical: [@knuth1984] or {cite:p}`knuth1984`.
Several: [@knuth1984; @mystmd].
```

For BibTeX files elsewhere, for example one bibliography shared by several collections, set `bibliography` in the `project` option of the integration (every collection) or of a loader. Paths are relative to the Astro project root, and the files are watched in `astro dev`:

```ts
// astro.config.ts
myst({ project: { bibliography: ['references/library.bib'] } });
```

Setting `bibliography` replaces the automatic search, so list every file you need, including those inside the collection folder.

## DOIs

A DOI is enough — no BibTeX entry needed:

```markdown
<doi:10.5281/zenodo.6476040>
[](doi:10.5281/zenodo.6476040)
[our paper](https://doi.org/10.5281/zenodo.6476040)
{cite:p}`10.5281/zenodo.6476040`
[@10.5281/zenodo.6476040]
```

If a `.bib` file contains an entry with that DOI, the entry is used. Otherwise mystmd downloads the metadata from doi.org during the build and caches it in its build folder, inside Astro's cache folder (`node_modules/.astro/astro-myst/<collection>/_build/cache`), so later builds on the same machine do not fetch it again. For example, <doi:10.5281/zenodo.6476040> resolves to the entry in this site's `references.bib`.

### Builds without network access

A fresh checkout (for example in CI) downloads the DOIs again, unless you [cache Astro's cache folder](#guide-deployment). To make builds independent of doi.org, write the downloaded entries to a BibTeX file once and commit it:

1. Build once with mystmd's `--doi-bib` flag, for example `mystLoader({ base: './src/content/blog', args: ['--doi-bib'] })`. mystmd writes `myst.doi.bib` next to the collection's generated project: `node_modules/.astro/astro-myst/<collection>/myst.doi.bib`.
2. Copy that file into the collection folder, commit it and remove the flag.

The loader finds `myst.doi.bib` like any other `.bib` file in the collection folder; if you set `bibliography` yourself, add it to the list.

### When a DOI cannot be resolved

An unknown DOI, a typo or an unreachable doi.org is reported in the Astro log with file and line, and the DOI stays a plain doi.org link. The build continues unless you pass `args: ['--strict']`.

## Numbered citations

For `[1]`-style citations instead of author–year, set `numberedCitations` on the integration (every collection) or on a loader:

```ts
myst({ numberedCitations: true });
```

Parenthetical citations then read `[3]` and narrative ones `Knuth [3]`, and the bibliography is numbered in citation order.

## The bibliography

astro-myst appends the bibliography to every page that cites something, as a `section.myst-bibliography` with the heading "References". Change the heading with `labels`, on the integration or a loader:

```ts
myst({ labels: { references: 'Bibliography' } });
```

Each entry has the id `cite-{label}`, which citations link to; the markup is described in [](#ref-components).
