import { describe, expect, it } from 'vitest';
import { renderMystPage, type RenderOptions } from '../src/render.js';
import type { MystNode, MystPageJson } from '../src/types.js';

const opts: RenderOptions = {
  resolvePageUrl: (u) => ({ '/': '/docs/', '/theory': '/docs/theory' })[u],
  resolveAssetUrl: (u) => `/docs/_myst${u}`,
};

const t = (value: string): MystNode => ({ type: 'text', value });
const page = (children: MystNode[], extra: Partial<MystPageJson> = {}): MystPageJson => ({
  kind: 'Article',
  slug: 'test',
  location: '/test.md',
  frontmatter: { title: 'Test' },
  mdast: { type: 'root', children: [{ type: 'block', children }] },
  ...extra,
});
const render = async (children: MystNode[], o: Partial<RenderOptions> = {}, extra: Partial<MystPageJson> = {}) =>
  renderMystPage(page(children, extra), { ...opts, ...o });

describe('renderMystPage', () => {
  it('renders numbered headings and collects them for the TOC', async () => {
    const { html, headings } = await render([
      { type: 'heading', depth: 2, identifier: 'sec-a', html_id: 'sec-a', enumerator: '1.2', children: [t('Methods')] },
      { type: 'heading', depth: 3, identifier: 'plain', html_id: 'plain', children: [t('Plain')] },
    ]);
    expect(html).toContain('<h2 id="sec-a"><span class="heading-number">1.2</span> Methods');
    expect(html).toContain('href="#sec-a"');
    expect(headings).toEqual([
      { depth: 2, slug: 'sec-a', text: '1.2 Methods' },
      { depth: 3, slug: 'plain', text: 'Plain' },
    ]);
  });

  it('links resolved cross-references locally and across pages', async () => {
    const { html } = await render([
      {
        type: 'paragraph',
        children: [
          { type: 'crossReference', kind: 'figure', identifier: 'fig-a', html_id: 'fig-a', resolved: true, children: [t('Figure 1')] },
          { type: 'crossReference', kind: 'equation', identifier: 'eq-b', html_id: 'eq-b', resolved: true, remote: true, url: '/theory', children: [t('(3)')] },
          { type: 'crossReference', kind: 'heading', identifier: 'sec-x', html_id: 'sec-x', resolved: true, remote: true, url: '/', children: [t('Section 1')] },
          { type: 'crossReference', identifier: 'missing', resolved: false },
        ],
      },
    ]);
    expect(html).toContain('<a class="xref" href="#fig-a" data-xref-kind="figure">Figure 1</a>');
    expect(html).toContain('href="/docs/theory#eq-b"');
    expect(html).toContain('href="/docs/#sec-x"');
    expect(html).toContain('class="xref xref-unresolved"');
  });

  it('renders numbered display math with the pre-rendered KaTeX HTML', async () => {
    const { html } = await render([
      { type: 'math', value: 'E=mc^2', label: 'eq-e', identifier: 'eq-e', html_id: 'eq-e', enumerator: '4', html: '<span class="katex">E</span>' },
      { type: 'math', value: 'x', html: '<span class="katex">x</span>' },
      { type: 'paragraph', children: [{ type: 'inlineMath', value: 'y' }] },
    ]);
    expect(html).toContain('<div class="math-display" id="eq-e"><div class="math-body"><span class="katex">E</span></div><span class="equation-number">(4)</span></div>');
    expect(html).toContain('<div class="math-display"><div class="math-body"><span class="katex">x</span></div></div>');
    expect(html).toContain('<span class="math-inline"><code>y</code></span>'); // fallback without html
  });

  it('renders figures with caption numbers and rewritten image URLs', async () => {
    const { html } = await render([
      {
        type: 'container',
        kind: 'figure',
        identifier: 'fig-a',
        html_id: 'fig-a',
        enumerator: '1',
        children: [
          { type: 'image', url: '/a-123.png', alt: 'A', width: '50%' },
          { type: 'caption', children: [{ type: 'paragraph', children: [{ type: 'captionNumber', kind: 'figure', children: [t('Figure 1:')] }, t('Caption')] }] },
        ],
      },
    ]);
    expect(html).toContain('<figure id="fig-a" class="myst-container myst-figure numbered" data-kind="figure">');
    expect(html).toContain('src="/docs/_myst/a-123.png"');
    expect(html).toContain('style="width: 50%"');
    expect(html).toContain('<span class="caption-number">Figure 1:</span> Caption');
  });

  it('renders tables with header rows in <thead>', async () => {
    const cell = (v: string, header = false): MystNode => ({ type: 'tableCell', header, children: [t(v)] });
    const { html } = await render([
      { type: 'table', children: [{ type: 'tableRow', children: [cell('A', true), cell('B', true)] }, { type: 'tableRow', children: [cell('1'), cell('2')] }] },
    ]);
    expect(html).toContain('<thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody>');
  });

  it('renders citations, a bibliography and footnotes', async () => {
    const { html } = await render(
      [
        {
          type: 'paragraph',
          children: [
            { type: 'citeGroup', kind: 'parenthetical', children: [{ type: 'cite', label: 'k84', kind: 'parenthetical', children: [t('Knuth, 1984')] }] },
            { type: 'footnoteReference', identifier: 'n', enumerator: '1' },
          ],
        },
        { type: 'footnoteDefinition', identifier: 'n', enumerator: '1', children: [{ type: 'paragraph', children: [t('Note.')] }] },
      ],
      {},
      { references: { cite: { order: ['k84'], data: { k84: { label: 'k84', html: 'Knuth, D. (1984). <i>The TeXbook</i>.' } } } } },
    );
    expect(html).toContain('<span class="cite-group">(<a class="cite" href="#cite-k84" data-cite="k84">Knuth, 1984</a>)</span>');
    expect(html).toContain('<sup class="footnote-ref"><a href="#fn-n" id="fnref-n" aria-label="Footnote 1">1</a></sup>');
    expect(html).toMatch(/<li id="fn-n" value="1"><p>Note\. <a class="footnote-backref" href="#fnref-n"/);
    expect(html).toContain('<li id="cite-k84">Knuth, D. (1984). <i>The TeXbook</i>.</li>');
  });

  it('rewrites internal page links and static asset links only', async () => {
    const { html } = await render([
      {
        type: 'paragraph',
        children: [
          { type: 'link', url: '/theory#eq-1', internal: true, children: [t('theory')] },
          { type: 'link', url: '/paper-abc.pdf', static: true, children: [t('pdf')] },
          { type: 'link', url: 'https://mystmd.org', children: [t('ext')] },
          { type: 'link', url: '/about', children: [t('astro route')] },
          { type: 'link', url: 'https://x.org', class: 'button', children: [t('btn')] },
        ],
      },
    ]);
    expect(html).toContain('<a href="/docs/theory#eq-1">theory</a>');
    expect(html).toContain('<a href="/docs/_myst/paper-abc.pdf">pdf</a>');
    expect(html).toContain('<a href="https://mystmd.org" target="_blank" rel="noopener noreferrer">ext</a>');
    expect(html).toContain('<a href="/about">astro route</a>');
    expect(html).toContain('class="button"');
  });

  it('links references into external MyST sites with their base URL', async () => {
    const { html } = await render([
      {
        type: 'paragraph',
        children: [
          { type: 'crossReference', kind: 'heading', identifier: 'install', html_id: 'install', resolved: true, remote: true, url: '/', remoteBaseUrl: 'https://mystmd.org/guide/', children: [t('Install')] },
        ],
      },
    ]);
    expect(html).toContain('href="https://mystmd.org/guide/#install"');
    expect(html).toContain('data-xref-external="true"');
  });

  it('honours notebook visibility (remove/hide)', async () => {
    const { html } = await render([
      {
        type: 'block',
        kind: 'notebook-code',
        children: [
          { type: 'code', lang: 'python', value: 'SECRET = 1', visibility: 'remove' },
          { type: 'outputs', visibility: 'hide', children: [{ type: 'output', jupyter_data: { output_type: 'stream', name: 'stdout', text: 'shown later' } }] },
        ],
      },
      { type: 'block', kind: 'notebook-code', visibility: 'remove', children: [{ type: 'code', value: 'REMOVED_CELL' }] },
    ]);
    expect(html).not.toContain('SECRET');
    expect(html).not.toContain('REMOVED_CELL');
    expect(html).toContain('<details class="myst-hidden"><summary>Show output</summary>');
  });

  it('renders proofs, admonitions and dropdowns', async () => {
    const { html } = await render([
      { type: 'proof', kind: 'theorem', label: 'thm', identifier: 'thm', html_id: 'thm', enumerator: '2', children: [{ type: 'admonitionTitle', children: [t('Big')] }, { type: 'paragraph', children: [t('Body')] }] },
      { type: 'admonition', kind: 'warning', children: [{ type: 'admonitionTitle', children: [t('Careful')] }, { type: 'paragraph', children: [t('x')] }] },
      { type: 'admonition', kind: 'note', class: 'dropdown', children: [{ type: 'admonitionTitle', children: [t('More')] }] },
    ]);
    expect(html).toContain('<aside class="proof proof-theorem" id="thm"><div class="proof-title"><strong>Theorem 2</strong> (Big)</div>');
    expect(html).toContain('<aside class="admonition admonition-warning"><div class="admonition-title">Careful</div>');
    expect(html).toContain('<details class="admonition admonition-note dropdown"><summary class="admonition-title">More</summary>');
  });

  it('highlights code with Shiki and can disable it', async () => {
    const code: MystNode = { type: 'code', lang: 'python', value: 'x = 1', emphasizeLines: [1] };
    const { html } = await render([code]);
    expect(html).toContain('class="shiki shiki-themes github-light github-dark code-block"');
    expect(html).toContain('class="line highlighted"');
    const plain = await render([code], { codeThemes: false });
    expect(plain.html).toContain('<pre class="code-block"><code class="language-python">x = 1</code></pre>');
  });

  it('supports custom handlers with fallback to the built-in renderer', async () => {
    const { html } = await render(
      [
        { type: 'myWidget', value: 'w' },
        { type: 'admonition', kind: 'tip', children: [{ type: 'paragraph', children: [t('wrapped')] }] },
        { type: 'admonition', kind: 'note', children: [{ type: 'paragraph', children: [t('default')] }] },
      ],
      {
        handlers: {
          myWidget: (node, ctx) => ctx.h('my-widget', { value: node.value }),
          admonition: (node, ctx) => (node.kind === 'tip' ? ctx.h('div', { class: 'wrap' }, ctx.renderDefault(node)) : undefined),
        },
      },
    );
    expect(html).toContain('<my-widget value="w"></my-widget>');
    expect(html).toContain('<div class="wrap"><aside class="admonition admonition-tip">');
    expect(html).toContain('<aside class="admonition admonition-note">');
  });

  it('renders notebook outputs', async () => {
    const { html } = await render([
      {
        type: 'outputs',
        children: [
          { type: 'output', jupyter_data: { output_type: 'stream', name: 'stdout', text: 'hello\n' } },
          { type: 'output', jupyter_data: { output_type: 'display_data', data: { 'image/png': { path: '/plot-1.png' } } } },
          { type: 'output', jupyter_data: { output_type: 'execute_result', data: { 'text/plain': { content: '42' } } } },
        ],
      },
    ]);
    expect(html).toContain('<pre class="output-stream stdout">hello\n</pre>');
    expect(html).toContain('<img src="/docs/_myst/plot-1.png" alt="Output">');
    expect(html).toContain('<pre class="output">42</pre>');
  });

  it('renders the older (mystmd < 1.7) output format and large outputs stored as files', async () => {
    const files: Record<string, string> = { '/big.html': '<table><tr><td>big</td></tr></table>', '/log.txt': 'full log' };
    const { html } = await render(
      [
        {
          type: 'output',
          data: [
            { output_type: 'stream', name: 'stdout', text: 'trunc...', path: '/log.txt' },
            { output_type: 'execute_result', data: { 'text/html': { content_type: 'text/html', path: '/big.html' }, 'text/plain': { content: 'df' } } },
          ],
        },
      ],
      { readAsset: (u) => files[u] },
    );
    expect(html).toContain('<pre class="output-stream stdout">full log</pre>');
    expect(html).toContain('<div class="output output-html"><table><tr><td>big</td></tr></table></div>');
  });

  it('escapes text and never crashes on unknown nodes', async () => {
    const { html } = await render([
      { type: 'paragraph', children: [t('<script>alert(1)</script>'), { type: 'somethingNew', children: [t('inner')] }] },
      { type: 'leafThing', value: 'leaf' },
      { type: 'mystDirective', name: 'unknown', args: 'a' },
    ]);
    expect(html).toContain('&#x3C;script>alert(1)&#x3C;/script>');
    expect(html).toContain('<span class="myst-somethingNew">inner</span>');
    expect(html).toContain('leaf');
    expect(html).toContain('<div class="myst-unhandled"><code>{unknown} a</code></div>');
  });
});
