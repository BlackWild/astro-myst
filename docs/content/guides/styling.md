---
title: Styling
label: guide-styling
description: Use, theme or replace the default styles for MyST content.
---

astro-myst emits plain, semantic HTML with predictable class names. Two stylesheets make it look right out of the box; both are optional.

```astro
---
import 'astro-myst/katex.css'; // math: needed whenever pages contain math
import 'astro-myst/styles.css'; // everything else: figures, equations, admonitions, …
---

<article class="myst">
  <Content />
</article>
```

The default styles only apply inside an element with the class `myst`, so they never leak into the rest of your site.

## Theming with custom properties

Colours are CSS custom properties, set on `.myst` with a dark variant for `prefers-color-scheme: dark`. Override them anywhere with equal or higher specificity:

```css
.myst {
  --myst-accent: #7c3aed; /* links, cross-references, active tabs */
  --myst-surface: #faf5ff; /* backgrounds of admonitions, proofs, code */
}
```

The full list is in [](#ref-components).

## Dark mode with a class toggle

If your site switches themes with a class or attribute instead of the media query, map the properties yourself:

```css
:root[data-theme='dark'] .myst {
  --myst-accent: #79b8e8;
  --myst-muted: #9aa5b1;
  --myst-border: #2f3740;
  --myst-surface: #161b22;
}
```

Code blocks carry both Shiki themes as CSS variables (`--shiki-light`, `--shiki-dark`); the default stylesheet picks one with `prefers-color-scheme`. With a class toggle, select the dark colours yourself:

```css
:root[data-theme='dark'] .myst pre.shiki span {
  color: var(--shiki-dark);
}
```

## Writing your own styles

Skip `styles.css` and style the elements directly. The most important hooks:

| Element | Markup |
|---|---|
| Numbered equation | `div.math-display > div.math-body + span.equation-number` |
| Figure, table, code listing | `figure.myst-container.myst-figure` (or `.myst-table`, `.myst-code`) with `figcaption > span.caption-number` |
| Cross-reference | `a.xref[data-xref-kind]` (`data-xref-remote` when it points to another page) |
| Citation | `a.cite`, grouped in `span.cite-group`; bibliography `section.bibliography` |
| Admonition | `aside.admonition.admonition-{kind}` with `.admonition-title` and `.admonition-body` |
| Theorem, proof, exercise | `aside.proof.proof-{kind}` with `.proof-title` |
| Section number | `h2 > span.heading-number` |

See [](#ref-components) for the complete list.
