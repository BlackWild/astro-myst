---
title: Citations and DOIs
label: guide-citations
description: Cite BibTeX entries or bare DOIs and get a bibliography on every page.
---

Citations are resolved by mystmd before astro-myst renders a page, so every MyST citation syntax works [@knuth1984]. Each page gets a bibliography of what it cites, and every citation links to its entry (with a hover preview when you use `XrefPreview`).

## BibTeX

Add `.bib` files to the project and cite their keys:

```yaml
project:
  bibliography:
    - references.bib
```

```markdown
Narrative: @knuth1984 or {cite:t}`knuth1984`.
Parenthetical: [@knuth1984] or {cite:p}`knuth1984`.
Several: [@knuth1984; @mystmd].
```

## DOIs

A DOI is enough — no BibTeX entry needed:

```markdown
<doi:10.5281/zenodo.6476040>
[](doi:10.5281/zenodo.6476040)
[our paper](https://doi.org/10.5281/zenodo.6476040)
{cite:p}`10.5281/zenodo.6476040`
[@10.5281/zenodo.6476040]
```

If a `.bib` file contains an entry with that DOI, the entry is used. Otherwise mystmd downloads the metadata from doi.org during the build and caches it in `<root>/_build/cache`, so only the first build fetches it. For example, <doi:10.5281/zenodo.6476040> resolves to the entry in this site's `references.bib`.

### Builds without network access

A fresh checkout (for example in CI) downloads the DOIs again. To make builds independent of doi.org, write them to a BibTeX file once and commit it:

```sh
cd content
npx myst build --doi-bib
```

This creates `myst.doi.bib`. MyST loads all `.bib` files in the project folder; if you list bibliography files explicitly in `myst.yml`, add `myst.doi.bib` to the list.

### When a DOI cannot be resolved

An unknown DOI, a typo or an unreachable doi.org is reported in the Astro log with file and line, and the DOI stays a plain doi.org link. The build continues unless you pass `mystArgs: ['--strict']`.

## Numbered citations

For `[1]`-style citations instead of author–year, set the site option in `myst.yml`:

```yaml
site:
  options:
    numbered_references: true
```

or pass `numberedReferences: true` to `mystLoader()`. The bibliography is then numbered in citation order.
