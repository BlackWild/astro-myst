// Keeps the README's custom-handler example type-correct and working.
import { describe, expect, it } from 'vitest';
import { type MystNodeHandler, mystLoader, renderMystPage } from '../src/index.js';

const admonition: MystNodeHandler = (node, ctx) => {
  if (node.kind !== 'tip') return undefined; // undefined → use the built-in renderer
  return ctx.h('div', { class: 'my-tip' }, ctx.renderDefault(node));
};

const handlers = {
  admonition,
  myWidget: ((node, ctx) => ctx.h('my-widget', { data: JSON.stringify(node.data) })) satisfies MystNodeHandler,
};

describe('README examples', () => {
  it('custom handlers', async () => {
    expect(mystLoader({ root: './content', handlers }).name).toBe('astro-myst');
    const { html } = await renderMystPage(
      {
        kind: 'Article',
        slug: 'x',
        location: '/x.md',
        frontmatter: {},
        mdast: {
          type: 'root',
          children: [
            { type: 'admonition', kind: 'tip', children: [] },
            { type: 'myWidget', data: { a: 1 } },
          ],
        },
      },
      { resolvePageUrl: () => undefined, resolveAssetUrl: (u) => u, handlers },
    );
    expect(html).toContain('<div class="my-tip"><aside class="admonition admonition-tip">');
    expect(html).toContain('<my-widget data="{&#x22;a&#x22;:1}"></my-widget>');
  });
});
