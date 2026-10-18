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
