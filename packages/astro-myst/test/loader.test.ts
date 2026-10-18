import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mystLoader } from '../src/loader.js';
import { mystSchema } from '../src/schema.js';
import { getState } from '../src/state.js';
import { FIXTURES, memoryLogger, setupIntegration } from './helpers.js';

/** An Astro project in a temp folder with the `collection` fixture at src/content/notes. */
function site() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-site-'));
  const content = path.join(root, 'src', 'content', 'notes');
  fs.cpSync(path.join(FIXTURES, 'collection'), content, { recursive: true });
  return { root, content };
}

/** Minimal stand-in for Astro's LoaderContext (enough for the loader's contract). */
function fakeContext(root: string, configOverrides: Record<string, unknown> = {}, watcher?: unknown) {
  const entries = new Map<string, any>();
  const metaStore = new Map<string, string>();
  const { logger, messages } = memoryLogger();
  const ctx = {
    collection: 'notes',
    config: {
      root: pathToFileURL(root + path.sep),
      publicDir: pathToFileURL(path.join(root, 'public') + path.sep),
      outDir: pathToFileURL(path.join(root, 'dist') + path.sep),
      cacheDir: pathToFileURL(path.join(root, 'node_modules', '.astro') + path.sep),
      base: '/',
      trailingSlash: 'ignore',
      ...configOverrides,
    },
    logger,
    store: {
      clear: () => entries.clear(),
      set: (e: any) => {
        entries.set(e.id, e);
        return true;
      },
      get: (id: string) => entries.get(id),
      keys: () => [...entries.keys()],
      values: () => [...entries.values()],
      entries: () => [...entries.entries()],
      has: (id: string) => entries.has(id),
      delete: (id: string) => entries.delete(id),
    },
    meta: {
      get: (k: string) => metaStore.get(k),
      set: (k: string, v: string) => metaStore.set(k, v),
      has: (k: string) => metaStore.has(k),
      delete: (k: string) => metaStore.delete(k),
    },
    parseData: async ({ data }: { data: unknown }) => mystSchema.parse(data),
    generateDigest: (d: unknown) => JSON.stringify(d).length.toString(36),
    watcher,
  };
  return { ctx: ctx as any, entries, messages };
}

const compiles = (messages: { msg: string }[]) => messages.filter((m) => m.msg.includes('compiled')).length;

describe('mystLoader', () => {
  it('loads every file of a folder as an entry, compiled together by mystmd', async () => {
    setupIntegration();
    const { root, content } = site();
    const { ctx, entries } = fakeContext(root, { base: '/docs', trailingSlash: 'always' });
    await mystLoader({ base: './src/content/notes', route: '/notes' }).load(ctx);

    // Ids as Astro's glob() would give them; files starting with `_` are not entries.
    expect([...entries.keys()].sort()).toEqual(['chapter', 'index', 'notes/hello-world']);
    const index = entries.get('index');
    // The author's own frontmatter is kept as written, next to MyST's normalized keys.
    expect(index.data).toMatchObject({
      title: 'Home',
      pubDate: new Date('2024-05-01'),
      draft: false,
      tags: ['intro'],
      authors: [],
      myst: { url: '/docs/notes/', order: 0, level: 1, kind: 'Article' },
    });
    expect(index.filePath).toBe('src/content/notes/index.md');
    expect(index.body.startsWith('\n(sec-intro)=\n## Introduction')).toBe(true);
    expect(index.rendered.metadata.headings).toEqual([{ depth: 2, slug: 'sec-intro', text: 'Introduction' }]);
    expect(index.rendered.metadata.frontmatter.title).toBe('Home');
    expect(entries.get('chapter').data.myst).toMatchObject({ url: '/docs/notes/chapter/', order: 1 });
    // A title from the first heading
    expect(entries.get('notes/hello-world').data).toMatchObject({ title: 'Hello note', myst: { order: 2 } });

    const html = index.rendered.html;
    expect(html).toContain('href="/docs/notes/chapter/#eq-euler"');
    expect(html).toMatch(/src="\/docs\/_myst\/notes\/dot-[0-9a-f]+\.svg"/);
    expect(html).toContain('href="#cite-knuth1984"'); // refs.bib found in the collection folder
    expect(entries.get('chapter').rendered.html).toContain('Included snippet text.');
    expect(entries.get('chapter').rendered.html).toContain('href="/docs/notes/#sec-intro"');

    // Only the assets pages use, in Astro's cache folder; nothing next to the content or in public/.
    const assets = getState()?.assets.get('notes');
    expect(assets).toBe(path.join(root, 'node_modules', '.astro', 'astro-myst', 'notes', 'assets'));
    expect(fs.readdirSync(assets!).map((f) => f.replace(/-[0-9a-f]+/, ''))).toEqual(['dot.svg']);
    expect(fs.readdirSync(content).sort()).toEqual([
      '_snippet.md',
      'chapter.md',
      'img',
      'index.md',
      'notes',
      'refs.bib',
    ]);
    expect(fs.existsSync(path.join(root, 'public'))).toBe(false);
  });

  it('reuses the previous build until a file changes, is added or removed', async () => {
    setupIntegration();
    const { root, content } = site();
    const { ctx, entries, messages } = fakeContext(root);
    const loader = mystLoader({ base: './src/content/notes' });
    await loader.load(ctx);
    await loader.load(ctx);
    expect(compiles(messages)).toBe(1);
    expect(messages.some((m) => m.msg.includes('reusing the previous mystmd build'))).toBe(true);
    expect(entries.get('chapter').data.myst.url).toBe('/notes/chapter'); // default route: /<collection>

    fs.appendFileSync(path.join(content, 'chapter.md'), '\nMore text.\n');
    await loader.load(ctx);
    expect(compiles(messages)).toBe(2);

    fs.writeFileSync(path.join(content, 'new.md'), '# New\n');
    await loader.load(ctx);
    expect(compiles(messages)).toBe(3);
    expect(entries.has('new')).toBe(true);
  });

  it('follows the toc, routes and ids it is given, and the integration options', async () => {
    setupIntegration({
      numberedCitations: true,
      labels: { references: 'Bibliography' },
      project: { numbering: { headings: true } },
    });
    const { root } = site();
    const { ctx, entries } = fakeContext(root);
    await mystLoader({
      base: './src/content/notes',
      toc: [{ file: 'chapter.md' }, { file: 'index.md', children: [{ file: 'notes/Hello World.md' }] }],
      route: (id) => `/read/${id.toUpperCase()}`,
      generateId: ({ entry }) => entry.replace(/\.md$/, ''),
    }).load(ctx);
    expect([...entries.values()].map((e) => [e.id, e.data.myst.order, e.data.myst.level])).toEqual([
      ['chapter', 0, 1],
      ['index', 1, 1],
      ['notes/Hello World', 2, 2],
    ]);
    const html = entries.get('index').rendered.html;
    expect(html).toContain('href="/read/CHAPTER#eq-euler"');
    expect(html).toContain('<span class="myst-heading-number">1</span> Introduction'); // numbering.headings
    expect(html).toContain('<h2>Bibliography</h2>');
    expect(html).toContain('[<a class="myst-cite" href="#cite-knuth1984" data-cite="knuth1984">1</a>]');
  });

  it('exposes toc groups, frontmatter parts and downloads, and places the bibliography', async () => {
    setupIntegration();
    const { root, content } = site();
    fs.writeFileSync(
      path.join(content, 'paper.md'),
      [
        '---',
        'title: Paper',
        'abstract: A *short* abstract.',
        'acknowledgments: Thanks.',
        'downloads:',
        '  - file: img/unused.svg',
        '    title: Figure',
        '  - url: https://example.org/data.zip',
        '    title: Data',
        '---',
        '',
        'Water is {chem}`H2O`; see {cite}`knuth1984`.',
        '',
        '```{bibliography}',
        '```',
        '',
        'After the references.',
        '',
      ].join('\n'),
    );
    const { ctx, entries } = fakeContext(root);
    await mystLoader({
      base: './src/content/notes',
      toc: [
        { file: 'index.md' },
        { title: 'Part I', children: [{ file: 'chapter.md', children: [{ file: 'paper.md' }] }] },
      ],
    }).load(ctx);
    expect(entries.get('index').data.myst.parents).toEqual([]);
    expect(entries.get('chapter').data.myst.parents).toEqual([{ title: 'Part I' }]);
    expect(entries.get('paper').data.myst.parents).toEqual([{ title: 'Part I' }, { title: 'Chapter', id: 'chapter' }]);
    expect(entries.get('notes/hello-world').data.myst.parents).toEqual([]); // not in the toc: appended at the top level

    const paper = entries.get('paper');
    const html: string = paper.rendered.html;
    // Frontmatter parts: the abstract before the content, others after it.
    expect(html.startsWith('<section class="myst-part myst-part-abstract" data-part="abstract">')).toBe(true);
    expect(html).toContain('<h2 class="myst-part-title">Abstract</h2><p>A <em>short</em> abstract.</p>');
    expect(html.indexOf('myst-part-acknowledgments')).toBeGreaterThan(html.indexOf('After the references.'));
    expect(paper.data.myst.parts).toEqual({
      abstract: expect.stringContaining('A <em>short</em> abstract.'),
      acknowledgments: expect.stringContaining('Thanks.'),
    });
    // {bibliography} places the references once, where it stands.
    expect(html.match(/class="myst-bibliography"/g)).toHaveLength(1);
    expect(html.indexOf('class="myst-bibliography"')).toBeLessThan(html.indexOf('After the references.'));
    expect(html).toContain('<span class="myst-chem">H<sub>2</sub>O</span>');
    // Downloads: files are published with the other assets.
    expect(paper.data.myst.downloads).toEqual([
      {
        title: 'Figure',
        url: expect.stringMatching(/^\/_myst\/notes\/unused-[0-9a-f]+\.svg$/),
        filename: 'unused.svg',
      },
      { title: 'Data', url: 'https://example.org/data.zip' },
    ]);
    const published = fs.readdirSync(getState()!.assets.get('notes')!).map((f) => f.replace(/-[0-9a-f]+/, ''));
    expect(published.sort()).toEqual(['dot.svg', 'unused.svg']);
  });

  it('exports pages with mystmd and publishes the files with the assets', async () => {
    setupIntegration({ exports: ['docx'] }); // the loader's option wins
    const { root, content } = site();
    const { ctx, entries } = fakeContext(root);
    await mystLoader({ base: './src/content/notes', exports: { pages: ['md', 'jats'] } }).load(ctx);
    expect(entries.get('chapter').data.myst.exports).toEqual([
      {
        title: 'Markdown',
        url: '/_myst/notes/exports/md/chapter.md',
        filename: 'chapter.md',
        format: 'md',
        scope: 'page',
      },
      {
        title: 'JATS XML',
        url: '/_myst/notes/exports/jats/chapter.xml',
        filename: 'chapter.xml',
        format: 'jats',
        scope: 'page',
      },
    ]);
    expect(entries.get('notes/hello-world').data.myst.exports[0]).toMatchObject({
      url: '/_myst/notes/exports/md/notes/hello-world.md',
      filename: 'Hello World.md',
    });
    const assets = getState()!.assets.get('notes')!;
    expect(fs.readFileSync(path.join(assets, 'exports', 'md', 'chapter.md'), 'utf8')).toContain('e^{i\\pi} + 1 = 0');
    expect(fs.readFileSync(path.join(assets, 'exports', 'jats', 'chapter.xml'), 'utf8')).toContain('<article');
    // Nothing is written next to the content.
    expect(fs.readdirSync(content).sort()).toEqual([
      '_snippet.md',
      'chapter.md',
      'img',
      'index.md',
      'notes',
      'refs.bib',
    ]);

    // `astro dev` (a watcher) exports only with `dev: true`.
    const watcher = { add() {}, on() {} };
    const dev = fakeContext(root, {}, watcher);
    await mystLoader({ base: './src/content/notes', exports: ['md'] }).load(dev.ctx);
    expect(dev.entries.get('chapter').data.myst.exports).toBeUndefined();
  });

  it('refuses frontmatter exports that would write next to the content, and unknown formats', async () => {
    setupIntegration();
    const { root, content } = site();
    fs.writeFileSync(
      path.join(content, 'paper.md'),
      '---\nexports:\n  - format: md\n    output: out/paper.md\n---\nText\n',
    );
    await expect(
      mystLoader({ base: './src/content/notes', exports: ['md'] }).load(fakeContext(root).ctx),
    ).rejects.toThrow(
      /paper\.md: the export "out\/paper\.md" in the frontmatter would be written next to your content/,
    );
    expect(fs.existsSync(path.join(content, 'out'))).toBe(false);
    await expect(
      mystLoader({ base: './src/content/notes', exports: ['pdf', 'html' as any] }).load(fakeContext(root).ctx),
    ).rejects.toThrow(/Unknown export format "html"/);
    await expect(
      mystLoader({ base: './src/content/notes', exports: { collection: ['md' as any] } }).load(fakeContext(root).ctx),
    ).rejects.toThrow(/Export format "md" cannot combine pages/);
  });

  it('reports duplicate ids, missing folders and a missing integration', async () => {
    setupIntegration();
    const { root, content } = site();
    fs.writeFileSync(path.join(content, 'other.md'), '---\nslug: chapter\n---\nText');
    await expect(mystLoader({ base: './src/content/notes' }).load(fakeContext(root).ctx)).rejects.toThrow(
      /both have the entry id "chapter"/,
    );
    await expect(mystLoader({ base: './src/nowhere' }).load(fakeContext(root).ctx)).rejects.toThrow(
      /\[astro-myst\] The content folder \.\/src\/nowhere does not exist/,
    );
    delete (globalThis as Record<symbol, unknown>)[Symbol.for('astro-myst.state')];
    await expect(mystLoader({ base: './src/content/notes' }).load(fakeContext(root).ctx)).rejects.toThrow(
      /needs the astro-myst integration/,
    );
  });

  it('keeps serving the last good pages in dev when a rebuild fails, and recovers', async () => {
    setupIntegration();
    const { root, content } = site();
    const watcher = Object.assign(new EventEmitter(), { add: () => undefined });
    const { ctx, entries, messages } = fakeContext(root, {}, watcher);
    let explode = false;
    const loader = mystLoader({
      base: './src/content/notes',
      handlers: {
        admonition: () => {
          if (explode) throw new Error('handler exploded');
          return undefined;
        },
      },
    });
    fs.appendFileSync(path.join(content, 'index.md'), '\n:::{note}\nA note.\n:::\n');
    await loader.load(ctx);
    expect(entries.size).toBe(3);

    const waitFor = async (pred: () => boolean) => {
      for (let i = 0; i < 300 && !pred(); i++) await new Promise((r) => setTimeout(r, 100));
      expect(pred()).toBe(true);
    };
    const count = (pred: (m: { level: string; msg: string }) => boolean) => messages.filter(pred).length;
    const loaded = (m: { msg: string }) => m.msg.startsWith('Loaded');
    const failed = (m: { level: string; msg: string }) => m.level === 'error' && m.msg.includes('handler exploded');

    explode = true;
    fs.appendFileSync(path.join(content, 'index.md'), '\nEdit 1.\n');
    watcher.emit('all', 'change', path.join(content, 'index.md'));
    await waitFor(() => count(failed) === 1);
    expect(entries.size).toBe(3); // previous pages still served
    expect(entries.get('index').rendered.html).not.toContain('Edit 1.');

    explode = false;
    const before = count(loaded);
    fs.appendFileSync(path.join(content, 'index.md'), '\nEdit 2.\n');
    watcher.emit('all', 'change', path.join(content, 'index.md'));
    await waitFor(() => count(loaded) === before + 1);
    expect(entries.get('index').rendered.html).toContain('Edit 2.');

    // Changes outside the collection, or in generated folders, never trigger rebuilds
    const recompiles = count((m) => m.msg.includes('recompiling'));
    watcher.emit('all', 'change', path.join(root, 'node_modules', '.astro', 'astro-myst', 'notes', 'myst.yml'));
    watcher.emit('all', 'change', path.join(content, '_build', 'site', 'config.json'));
    watcher.emit('all', 'change', path.join(root, 'src', 'pages', 'index.astro'));
    await new Promise((r) => setTimeout(r, 400));
    expect(count((m) => m.msg.includes('recompiling'))).toBe(recompiles);
  });
});
