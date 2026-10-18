# astro-myst example: a LaTeX paper

A scientific article written in **LaTeX** (`content/index.tex`) with a supplement in **MyST Markdown** (`content/supplement.md`). mystmd compiles both as one project, so:

- `\ref`, `\eqref` and `\cite` work across the two files (and `[](#eq:lindblad)` from Markdown into LaTeX)
- the supplement numbers its own figures and equations as `S1`, `S2`, … (`numbering.enumerator`)
- citations from `references.bib` (including the DOI form `<doi:…>`) get a per-page bibliography
- `\begin{abstract}`, `\title`, `\author`, theorem-like environments, `align`, `siunitx` and footnotes are supported

```sh
# from the repository root
npm install
npm run build
npm run dev -w astro-myst-example-paper
```
