---
'astro-myst': patch
---

Images now get both `width` and `height` as CSS, as in MyST's own theme: `:height: 40%` was written as the HTML attribute `height="40%"`, which browsers read as 40 pixels, and heights had no effect inside figures. `.mp4` files in `{image}`, `{figure}` and `![](...)` render as looping, muted `<video>` elements instead of broken images.
