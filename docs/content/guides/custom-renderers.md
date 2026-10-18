---
title: Custom renderers
label: guide-custom-renderers
description: Change how individual MyST node types are rendered, or render nodes from MyST plugins.
---

Every MyST page is an AST of typed nodes (`paragraph`, `math`, `crossReference`, `admonition`, …). astro-myst has a built-in renderer for each node type MyST produces. The `handlers` option replaces or wraps the renderer of any type, including new types added by [MyST plugins](https://mystmd.org/guide/plugins).

## Where handlers go

`handlers` is a [render setting](#ref-options-render): set it on the integration for every MyST collection, or on a loader for one collection.

```ts
// astro.config.ts
import { defineConfig } from 'astro/config';
import myst, { type MystNodeHandler } from 'astro-myst';

// Wrap tips in an extra element; leave all other admonitions alone.
const admonition: MystNodeHandler = (node, ctx) => {
  if (node.kind !== 'tip') return undefined; // undefined: use the built-in renderer
  return ctx.h('div', { class: 'my-tip' }, ctx.renderDefault(node));
};

export default defineConfig({
  integrations: [myst({ handlers: { admonition } })],
});
```

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  docs: defineCollection({
    loader: mystLoader({
      base: './src/content/docs',
      handlers: {
        // A node type created by a MyST plugin
        myWidget: (node, ctx) => ctx.h('my-widget', { dataConfig: JSON.stringify(node.data) }),
      },
    }),
  }),
};
```

The two are combined. For a node type that has a handler in both places, the loader's handler is used. The type `MystNodeHandler` is exported by `astro-myst` and by `astro-myst/loaders`.

MyST plugins themselves are loaded through the `project` option, with paths relative to the Astro project root. They are watched in `astro dev`:

```ts
myst({ project: { plugins: ['myst-plugins/widget.mjs'] } });
```

## A handler

```ts
type MystNodeHandler = (
  node: MystNode,
  ctx: MystRenderContext,
  parent?: MystNode,
) => HastChild | HastChild[] | null | undefined;
```

A handler receives the node, a context and the parent node, and returns:

- one or more [hast](https://github.com/syntax-tree/hast) nodes (elements, text, or raw HTML from `ctx.raw`) to use instead of the built-in output,
- `undefined` to fall back to the built-in renderer,
- `null` to render nothing.

## The context

| Member | Purpose |
|---|---|
| `h(tag, props?, children?)` | Create an element, like [hastscript](https://github.com/syntax-tree/hastscript). `children` may be rendered nodes or a string. Use `class` for classes and camelCase for other attributes (`dataKind` becomes `data-kind`). |
| `renderDefault(node, parent?)` | Render a node with the built-in renderer, ignoring handlers; for wrapping or adjusting the built-in output |
| `all(node)` | Render the children of a node (handlers apply) |
| `one(node, parent?)` | Render a node (handlers apply) |
| `raw(html)` | Embed an HTML string as it is |
| `text(value)` | Create a text node |
| `resolvePageUrl(mystUrl)` | Map a MyST page URL such as `/theory` to the URL of the page on your site, or `undefined` |
| `resolveAssetUrl(url)` | Map a MyST asset URL such as `/fig-1a2b.png` to its public URL |
| `page` | The page as mystmd wrote it: `frontmatter`, `references`, the whole AST in `mdast` |

## Examples

Open links to other sites in the same tab. The built-in renderer gives them `target="_blank"` and `rel="noopener noreferrer"`:

```ts
import type { MystNodeHandler } from 'astro-myst';

const link: MystNodeHandler = (node, ctx) => {
  const out = ctx.renderDefault(node);
  for (const el of out) {
    if (el.type === 'element') {
      delete el.properties.target;
      delete el.properties.rel;
    }
  }
  return out;
};
```

Add classes to the built-in output, for example typography's `not-prose` and Tailwind utilities on every admonition (see [](#guide-styling-tailwind)):

```ts
const admonition: MystNodeHandler = (node, ctx) => {
  const out = ctx.renderDefault(node); // aside.myst-admonition, or details.myst-admonition for dropdowns
  for (const el of out) {
    if (el.type === 'element') (el.properties.className as string[]).push('not-prose', 'rounded-lg', 'p-4');
  }
  return out;
};
```

Without a handler, directives and roles that MyST could not process render as a visible `.myst-unhandled` placeholder, and nodes of unknown types as `div.myst-{type}` (or `span.myst-{type}` inline). To leave unprocessed directives and roles out instead:

```ts
handlers: { mystDirective: () => null, mystRole: () => null }
```

See [](#ref-components) for the markup of every built-in node type.

## Finding node shapes

Handlers receive nodes exactly as mystmd wrote them. To see their shape, open the page's JSON after a build: `node_modules/.astro/astro-myst/<collection>/_build/site/content/<page>.json` (in Astro's `cacheDir`), or read the [MyST AST specification](https://mystmd.org/spec).

## Interactive components

Handlers produce static HTML. To make something interactive, emit a custom element (as `my-widget` above) and register it in a client-side script in your layout, or emit markup that an island component hydrates.
