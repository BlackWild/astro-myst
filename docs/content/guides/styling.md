---
title: Styling
label: guide-styling
description: Choose the built-in styles, theme them, or style MyST content yourself with CSS or Tailwind.
---

astro-myst renders plain, semantic HTML. The classes it adds start with `myst-` (`myst-admonition`, `myst-xref`, `myst-math-display`, …), so they never clash with your site's classes; [](#ref-components) lists them and the few exceptions. The integration adds stylesheets to every page, and the `styles` option decides which.

## The `styles` option

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

export default defineConfig({
  integrations: [myst({ styles: 'theme' })],
});
```

| Value | Adds to every page | Use it when |
|---|---|---|
| `'base'` (default) | `astro-myst/katex.css` and `astro-myst/base.css` | you style the content yourself, with your own CSS, Tailwind or `prose` |
| `'theme'` | the same, plus `astro-myst/theme.css` | you want a complete look without writing CSS |
| `false` | nothing | you import the stylesheets yourself ([see below](#guide-styling-manual)) |

`katex.css` styles the math, which mystmd renders to HTML at build time.

## What `base.css` does

`base.css` contains only what MyST content needs to work, and almost no colours, fonts or spacing:

- equation numbers beside display math, and horizontal scrolling for wide equations, code blocks and tables;
- code in dark mode: Shiki colours code blocks for the light theme, and `base.css` switches them to the dark theme;
- line numbers and emphasized lines in code blocks, and the position of the copy button that the optional `copyCode` [script](#ref-options-scripts) adds (top right, shown on hover);
- tabs that work without JavaScript, and `{grid}` columns per breakpoint (576, 768 and 992 px);
- responsive images and videos in figures, sub-figures side by side, and `:align: left` / `right` floats;
- heading anchors (`#`) that appear on hover and focus;
- bibliography lists without list numbers (with `[1]`-style numbers for [numbered citations](#guide-citations)), and small caps;
- the box of the hover previews of [`XrefPreview`](#ref-components).

Every selector is wrapped in `:where()`, which gives it zero specificity, and sits in the cascade layer `components`: any rule of yours for the same element wins, whatever its selector and wherever it comes in the page, and so do Tailwind's utilities and `prose`; see [](#guide-styling-tailwind).

## The optional theme

`styles: 'theme'` adds `theme.css`, a small, neutral look for admonitions, proofs and theorems, cards, tabs, figures and captions, tables, code blocks and their copy buttons, cross-references, `{button}` links, footnotes and the bibliography, margin notes and sidebars, notebook outputs and hover previews. Its selectors have zero specificity and sit in the same layer. This documentation uses it.

The theme styles MyST components (everything with a `myst-` class) wherever they appear. Plain elements are styled only inside an element with the class `myst`: tables, and the scroll offset and highlight of link targets such as headings. Put the class on the element that wraps `<Content />`:

```astro
<article class="myst">
  <h1>{entry.data.title}</h1>
  <Content />
</article>
```

(guide-styling-margin)=
### Margin notes

`{margin}` and `{aside}` notes float to the right of the text, and so do `{sidebar}` boxes. MyST's own themes put margin notes into a column beside the text instead. With the theme, add the class `myst-margin-column` next to `myst` when your layout leaves room on the right of the content, and margin notes hang in the page margin on screens at least 1280 px wide:

```astro
<article class="myst myst-margin-column" style="--myst-margin-width: 12rem">
  <Content />
</article>
```

`--myst-margin-width` (default `14rem`) is the width of the notes; they need that much room plus `2rem` right of the content. On narrower screens they float as before.

### Colours

The theme's colours are CSS custom properties such as `--myst-accent` (links and cross-references) and `--myst-surface` (backgrounds of admonitions and code); [](#ref-components) lists them all. They are set on `:root`, with dark values for dark mode. To change them, declare them in your own stylesheet with the same selectors, light values first:

```css
/* src/styles/global.css */
:root {
  --myst-accent: #6d28d9;
  --myst-highlight: rgb(109 40 217 / 0.08);
}
/* Dark mode: the same selectors as theme.css. Keep the ones your site uses. */
@media (prefers-color-scheme: dark) {
  :root:not(.light):not([data-theme='light']) {
    --myst-accent: #c4b5fd;
    --myst-highlight: rgb(196 181 253 / 0.12);
  }
}
.dark,
[data-theme='dark'] {
  --myst-accent: #c4b5fd;
  --myst-highlight: rgb(196 181 253 / 0.12);
}
```

Your values win because the integration adds its stylesheets before the CSS your pages and layouts import.

(guide-styling-dark-mode)=
## Dark mode

`base.css` (for code) and `theme.css` (for colours) switch to dark mode:

- when the system prefers a dark colour scheme (`prefers-color-scheme: dark`), unless the `<html>` element has the class `light` or `data-theme="light"`;
- when an ancestor of the content has the class `dark` or `data-theme="dark"`, as with Tailwind's class-based dark mode.

:::{important}
If your site has a dark mode toggle, mark both states on `<html>`: `class="dark"` or `class="light"` (or `data-theme="dark"` / `"light"`). With only a `dark` class, a visitor whose system is dark sees dark code blocks on your light page.
:::

## Code highlighting themes

Code blocks are highlighted with [Shiki](https://shiki.style) at build time. The `codeThemes` option takes any two [bundled Shiki themes](https://shiki.style/themes):

```ts
myst({
  codeThemes: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' },
});
```

Shiki writes the light colours as inline styles and the dark ones as CSS variables (`--shiki-dark`, `--shiki-dark-bg`), and `base.css` switches to them in [dark mode](#guide-styling-dark-mode). For a single theme in both modes, pass the same theme twice. `codeThemes: false` turns highlighting off: code blocks are then uncoloured `pre.myst-code-block > code.language-…` elements for you to style.

`codeThemes` is also a loader option, to use other themes in one collection. Astro's own `markdown.shikiConfig` does not apply to MyST collections.

(guide-styling-tailwind)=
## Tailwind CSS and typography

astro-myst works with [Tailwind CSS](https://tailwindcss.com) and its typography plugin. Keep the default `styles: 'base'`: `base.css` keeps equations, tabs and code colours working and leaves the look to you. Set up Tailwind with `npx astro add tailwind`, then add the plugin:

```sh
npm install -D @tailwindcss/typography
```

```css
/* src/styles/global.css */
@import 'tailwindcss';
@plugin '@tailwindcss/typography';
```

### A blog with `prose`

Put `prose` on the element that wraps `<Content />`. MyST output is ordinary HTML, so `prose` styles its headings, paragraphs, lists, tables, figures and links like any Markdown, and its element modifiers (`prose-a:…`, `prose-figcaption:…`) work as usual. Code blocks keep their Shiki colours, which are inline styles.

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  blog: defineCollection({ loader: mystLoader({ base: './src/content/blog' }) }),
};
```

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection, render } from 'astro:content';
import '../../styles/global.css';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.id === 'index' ? undefined : post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
const { title, date } = post.data;
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{title}</title>
  </head>
  <body class="bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200">
    <article class="prose prose-slate dark:prose-invert mx-auto max-w-3xl px-4 py-12">
      <h1>{title}</h1>
      {date && <time datetime={date.toISOString()}>{date.toLocaleDateString('en-GB')}</time>}
      <Content />
    </article>
  </body>
</html>
```

### Styling MyST components

`prose` knows nothing about admonitions, proofs, tabs or cards, and `base.css` gives them no look. Style them through their `myst-` classes, either with arbitrary variants on the wrapper:

```astro
<article
  class="prose dark:prose-invert [&_.myst-admonition]:my-6 [&_.myst-admonition]:rounded-lg [&_.myst-admonition]:border [&_.myst-admonition]:px-4 [&_.myst-admonition-title]:pt-3 [&_.myst-admonition-title]:font-semibold"
>
  <Content />
</article>
```

or, for more than a few rules, with `@apply` in your stylesheet:

```css
/* src/styles/global.css */
@import 'tailwindcss';
@plugin '@tailwindcss/typography';

.myst-admonition {
  @apply my-6 rounded-lg border-l-4 border-sky-500 bg-sky-50 px-4 py-1 dark:bg-sky-950/40;
}
.myst-admonition-title {
  @apply pt-2 font-semibold text-sky-800 dark:text-sky-300;
}
.myst-admonition-warning,
.myst-admonition-danger {
  @apply border-amber-500 bg-amber-50 dark:bg-amber-950/40;
}
.myst-proof {
  @apply my-6 border-l-2 border-violet-400 pl-4;
}
.myst-tabs > input:checked + label {
  @apply border-b-2 border-sky-500 font-semibold no-underline;
}
```

The class names and the structure of each component are listed in [](#ref-components).

To keep `prose` out of a component, give it typography's `not-prose` class. Authors can do that per directive with `:class: not-prose`; for every component of a type, add a [custom renderer](#guide-custom-renderers) that wraps the built-in output:

```ts
// astro.config.ts
myst({
  handlers: {
    // Grids of cards get no prose styles; style them yourself.
    grid: (node, ctx) => ctx.h('div', { class: 'not-prose' }, ctx.renderDefault(node)),
  },
});
```

:::{note} Tailwind CSS 4 and cascade layers
Tailwind 4 puts its CSS into the cascade layers `theme`, `base` (preflight), `components` and `utilities`, in that order; `prose` is in `utilities`. astro-myst's stylesheets declare the same order and put their rules in `components`, so they come after preflight, which would otherwise reset their margins and borders, and before every utility, whichever stylesheet loads first. Where a Tailwind class and an astro-myst rule set the same property, Tailwind wins; CSS of yours outside any layer, like the `@apply` rules above, wins over both.
:::

### Dark mode toggle

Tailwind's `dark:` variant follows the system setting by default, as astro-myst does. For a toggle, switch Tailwind to the class and mark both states on `<html>`, as described in [dark mode](#guide-styling-dark-mode) above:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

(guide-styling-manual)=
## Importing the stylesheets yourself

With `styles: false`, the integration adds no CSS. Import the stylesheets where you need them, for example only in the layout of your MyST pages, so that other pages do not load them:

```astro
---
// src/layouts/Post.astro
import 'astro-myst/katex.css'; // math; needed whenever pages contain math
import 'astro-myst/base.css';
import 'astro-myst/theme.css'; // optional
import '../styles/post.css'; // your own styles, after the theme
---
```

Without `base.css`, your CSS has to make tabs, equation numbers and dark-mode code colours work; [](#ref-components) describes the markup.
