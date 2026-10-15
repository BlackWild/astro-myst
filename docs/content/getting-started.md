---
title: Getting started
label: getting-started
description: Install astro-myst, add a MyST project to an Astro site and render its pages.
---

This guide adds a MyST project to an Astro site in four steps. The finished result is the [minimal example](https://github.com/BlackWild/astro-myst/tree/main/examples/minimal).

## Requirements

- Astro 5, 6 or 7, with the Node.js version your Astro release requires (Node 22.12 or newer for current releases)
- `mystmd` 1.3 or newer — installed from npm below, or an existing `myst` / `jupyter-book` executable (see [`command`](#ref-loader-options))

## 1. Install

```sh
npm install astro-myst mystmd
```

`mystmd` is the MyST compiler. It is a peer dependency, so you choose and pin its version.

## 2. Add a MyST project

Create a folder for your content, for example `content/`, with a `myst.yml` and some pages. `npx myst init` in that folder creates the configuration for you.

```yaml
# content/myst.yml
version: 1
project:
  title: My project
  toc:
    - file: index.md
    - file: methods.md
site: {}
```

:::{important}
`myst.yml` needs a `site:` section, because astro-myst runs `myst build --site`. `site: {}` is enough.
:::

```markdown
<!-- content/index.md -->
---
title: Introduction
---

We measure the decay described by @eq-decay on the [methods page](./methods.md).
```

````markdown
<!-- content/methods.md -->
---
title: Methods
---

```{math}
:label: eq-decay
N(t) = N_0 e^{-\lambda t}
```
````

## 3. Define a collection

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst';

export const collections = {
  docs: defineCollection({ loader: mystLoader({ root: './content' }) }),
};
```

Every page of the MyST project becomes one entry. The entry `id` is the MyST page slug; `data` holds the title, authors, URL, position in the table of contents and the full frontmatter (see [](#ref-entry-data)).

## 4. Render the pages

```astro
---
// src/pages/[...slug].astro
import { getCollection, render } from 'astro:content';
import XrefPreview from 'astro-myst/XrefPreview.astro';
import 'astro-myst/katex.css';
import 'astro-myst/styles.css';

export async function getStaticPaths() {
  const pages = await getCollection('docs');
  return pages.map((page) => ({ params: { slug: page.data.path || undefined }, props: { page } }));
}

const { page } = Astro.props;
const { Content } = await render(page);
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{page.data.title}</title>
  </head>
  <body>
    <article class="myst">
      <h1>{page.data.title}</h1>
      <Content />
    </article>
    <XrefPreview />
  </body>
</html>
```

- `page.data.path` is `""` for the project's index page, so it is served at `/`.
- The default styles apply inside an element with the class `myst`.
- `katex.css` styles the math, which mystmd renders to HTML at build time.

Run `npm run dev`. The loader compiles the project and recompiles it whenever a file in `content/` changes; numbers and references update on every page.

## 5. Ignore generated files

```text
# .gitignore
content/_build/
public/_myst/
```

`_build/` is mystmd's build folder. `public/_myst/` receives images, notebook outputs and downloads referenced by your pages.

## Next

- [](#guide-routing) — navigation, tables of contents and prev/next links
- [](#guide-styling) — theming the output
- [](#guide-deployment) — building in CI and deploying
