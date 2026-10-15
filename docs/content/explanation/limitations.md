---
title: Limitations
label: limitations
description: Known limitations and their workarounds.
---

- **Static output.** Interactive features of MyST's React themes — live Jupyter kernels (Thebe), interactive widgets — are not reproduced. Their content renders statically.
- **Mermaid** blocks are emitted as `<pre class="mermaid">` with the diagram source; add the Mermaid script to your layout to draw them.
- **One project per collection.** Use one collection per MyST project, and the `project` option for multi-project sites ([](#guide-multiple-projects)).
- **Files outside the project** are watched and part of the cache key only when listed in `extraInputs`.
- **Full rebuilds in dev.** Any change recompiles the whole MyST project. This keeps numbering consistent, but very large projects take a few seconds per change.
- **LaTeX** support is mystmd's, which is not a full TeX engine ([](#guide-latex)).
- **Site options of MyST themes** (for example `hide_toc` or `logo` in `site.options`) have no effect: your Astro layout is the theme. `numbered_references` and `folders` are honoured.
