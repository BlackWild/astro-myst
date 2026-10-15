---
title: Custom renderers
label: guide-custom-renderers
description: Change how individual MyST node types are rendered, or render nodes from MyST plugins.
---

Every MyST page is an AST of typed nodes (`paragraph`, `math`, `crossReference`, `admonition`, …). astro-myst has a built-in renderer for each node type MyST produces. The `handlers` option replaces or wraps the renderer for any type — including new types added by [MyST plugins](https://mystmd.org/guide/plugins).

## A handler

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { mystLoader, type MystNodeHandler } from 'astro-myst';

// Wrap tips in an extra element; leave all other admonitions alone.
const admonition: MystNodeHandler = (node, ctx) => {
  if (node.kind !== 'tip') return undefined; // undefined → built-in renderer
  return ctx.h('div', { class: 'my-tip' }, ctx.renderDefault(node));
};

export const collections = {
  docs: defineCollection({
    loader: mystLoader({
      root: './content',
      handlers: {
        admonition,
        // a node type created by a MyST plugin
        myWidget: (node, ctx) => ctx.h('my-widget', { data: JSON.stringify(node.data) }),
      },
    }),
  }),
};
```

A handler receives the node, a context and the parent node, and returns:

- one or more [hast](https://github.com/syntax-tree/hast) nodes to use instead of the built-in output,
- `undefined` to fall back to the built-in renderer,
- `null` to render nothing.

## The context

| Member | Purpose |
|---|---|
| `all(node)` | render the children of a node (handlers apply) |
| `one(node, parent?)` | render a node (handlers apply) |
| `renderDefault(node, parent?)` | render a node with the built-in renderer, ignoring handlers — for wrapping |
| `h(tag, props?, children?)` | create an element, like [hastscript](https://github.com/syntax-tree/hastscript); children may be rendered nodes or a string |
| `raw(html)` | embed an HTML string as-is |
| `text(value)` | create a text node |
| `resolvePageUrl(mystUrl)` | map a MyST page URL such as `/theory` to its Astro URL (or `undefined`) |
| `resolveAssetUrl(url)` | map a MyST asset URL such as `/fig-1a2b.png` to its public URL |
| `page` | the page JSON: frontmatter, references, the whole AST |

## Finding node shapes

Handlers receive nodes exactly as mystmd wrote them. To see their shape, open `<root>/_build/site/content/<page>.json` after a build, or read the [MyST AST specification](https://mystmd.org/spec).

## Interactive components

Handlers produce static HTML. To make something interactive, emit a custom element (as `my-widget` above) and register it in a client-side script in your layout, or emit markup that an island component hydrates.
