import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mystLoader, mystPageSchema } from '../src/loader.js';
import { copyFixture, memoryLogger } from './helpers.js';

/** Minimal stand-in for Astro's LoaderContext (enough for the loader's contract). */
function fakeContext(projectDir: string, publicDir: string, configOverrides: Record<string, unknown> = {}, watcher?: any) {
  const entries = new Map<string, any>();
  const metaStore = new Map<string, string>();
  const { logger, messages } = memoryLogger();
  const ctx = {
    collection: 'book',
    config: {
      root: pathToFileURL(projectDir + path.sep),
      publicDir: pathToFileURL(publicDir + path.sep),
      outDir: pathToFileURL(path.join(projectDir, 'dist') + path.sep),
      cacheDir: pathToFileURL(path.join(projectDir, 'node_modules', '.astro') + path.sep),
      base: '/',
      trailingSlash: 'ignore',
      ...configOverrides,
    },
    logger,
    store: {
      clear: () => entries.clear(),
      set: (e: any) => (entries.set(e.id, e), true),
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
    parseData: async ({ data }: { data: unknown }) => mystPageSchema.parse(data),
    generateDigest: (d: unknown) => JSON.stringify(d).length.toString(36),
    watcher,
  };
  return { ctx: ctx as any, entries, messages };
}

describe('mystLoader', () => {
  it('stores one rendered entry per MyST page and copies assets', async () => {
    const site = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-site-'));
    const content = copyFixture('basic');
    fs.cpSync(content, path.join(site, 'content'), { recursive: true });
    const publicDir = path.join(site, 'public');
    const { ctx, entries, messages } = fakeContext(site, publicDir, { base: '/docs', trailingSlash: 'always' });

    const loader = mystLoader({ root: './content' });
    await loader.load(ctx);

    expect([...entries.keys()].sort()).toEqual(['chapter', 'index']);
    const index = entries.get('index');
    expect(index.data).toMatchObject({ title: 'Home', path: '', url: '/docs/', isIndex: true, order: 0, projectTitle: 'Fixture Book' });
    expect(entries.get('chapter').data).toMatchObject({ path: 'chapter', url: '/docs/chapter/', order: 1 });
    expect(index.rendered.html).toContain('href="/docs/chapter/#eq-euler"');
    expect(index.rendered.html).toMatch(/src="\/docs\/_myst\/book\/dot-[0-9a-f]+\.svg"/);
    expect(index.rendered.metadata.headings[0]).toEqual({ depth: 2, slug: 'sec-intro', text: '1 Introduction' });
    expect(fs.readdirSync(path.join(publicDir, '_myst', 'book')).some((f) => f.endsWith('.svg'))).toBe(true);

    // Second run with unchanged sources reuses the previous mystmd build
    await loader.load(ctx);
    expect(messages.some((m) => m.msg.includes('reusing the previous mystmd build'))).toBe(true);
    expect(entries.size).toBe(2);

    // Touching a source invalidates the cache
    const file = path.join(site, 'content', 'chapter.md');
    fs.appendFileSync(file, '\nMore text.\n');
    const before = messages.filter((m) => m.msg.includes('compiled')).length;
    await loader.load(ctx);
    expect(messages.filter((m) => m.msg.includes('compiled')).length).toBe(before + 1);
  });

  it('throws during builds when mystmd fails', async () => {
    const site = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-site-'));
    fs.mkdirSync(path.join(site, 'content'));
    const { ctx } = fakeContext(site, path.join(site, 'public'));
    await expect(mystLoader({ root: './content' }).load(ctx)).rejects.toThrow(/\[astro-myst\] No myst\.yml/);
  });

  it('loads one project of a multi-project MyST site', async () => {
    const site = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-site-'));
    fs.cpSync(copyFixture('multi'), path.join(site, 'content'), { recursive: true });
    const { ctx, entries, messages } = fakeContext(site, path.join(site, 'public'));
    await mystLoader({ root: './content' }).load(ctx);
    expect([...entries.keys()].sort()).toEqual(['index', 'intro']);
    expect(entries.get('index').data).toMatchObject({ title: 'A home', projectTitle: 'Project A', source: 'a/index.md' });
    expect(entries.get('index').rendered.html).toContain('href="/intro#sec-a-intro"');
    expect(entries.get('intro').rendered.html).toContain('<a href="/">home</a>');
    expect(messages.some((m) => m.level === 'warn' && m.msg.includes('2 projects'))).toBe(true);

    await mystLoader({ root: './content', project: 'b', cache: false }).load(ctx);
    expect([...entries.keys()]).toEqual(['index']);
    expect(entries.get('index').data).toMatchObject({ title: 'B home', source: 'b/index.md' });
  });

  it('refuses asset folders outside public/', async () => {
    const site = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-site-'));
    fs.cpSync(copyFixture('basic'), path.join(site, 'content'), { recursive: true });
    fs.mkdirSync(path.join(site, 'public'));
    fs.writeFileSync(path.join(site, 'public', 'keep.txt'), 'keep');
    const { ctx } = fakeContext(site, path.join(site, 'public'));
    for (const assetsDir of ['/', '', '.', '..', '../src', 'a/../..']) {
      await expect(mystLoader({ root: './content', assetsDir }).load(ctx)).rejects.toThrow(/assetsDir/);
    }
    expect(fs.existsSync(path.join(site, 'public', 'keep.txt'))).toBe(true);
  });

  it('caches correctly when the MyST project is the Astro root and with extraInputs', async () => {
    const site = copyFixture('basic'); // myst.yml at the Astro root, public/ inside it
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-shared-'));
    fs.writeFileSync(path.join(outside, 'shared.md'), 'Shared text v1');
    const rel = path.relative(site, path.join(outside, 'shared.md')).split(path.sep).join('/');
    fs.appendFileSync(path.join(site, 'index.md'), `\n\`\`\`{include} ${rel}\n\`\`\`\n`);
    const { ctx, entries, messages } = fakeContext(site, path.join(site, 'public'));
    const loader = mystLoader({ root: '.', extraInputs: [outside] });
    const compiles = () => messages.filter((m) => m.msg.includes('compiled')).length;

    await loader.load(ctx);
    expect(compiles()).toBe(1);
    expect(entries.get('index').rendered.html).toContain('Shared text v1');
    await loader.load(ctx); // the copied public/_myst assets must not invalidate the cache
    expect(compiles()).toBe(1);

    fs.writeFileSync(path.join(outside, 'shared.md'), 'Shared text v2 (longer)');
    await loader.load(ctx);
    expect(compiles()).toBe(2);
    expect(entries.get('index').rendered.html).toContain('Shared text v2');
  });

  it('keeps serving the last good pages in dev when a rebuild fails, and recovers', async () => {
    const site = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-site-'));
    fs.cpSync(copyFixture('basic'), path.join(site, 'content'), { recursive: true });
    const watcher = Object.assign(new EventEmitter(), { add: () => undefined });
    const { ctx, entries, messages } = fakeContext(site, path.join(site, 'public'), {}, watcher);
    let explode = false;
    const loader = mystLoader({
      root: './content',
      handlers: { admonition: () => { if (explode) throw new Error('handler exploded'); return undefined; } },
    });
    await loader.load(ctx);
    expect(entries.size).toBe(2);

    const waitFor = async (pred: () => boolean) => {
      for (let i = 0; i < 300 && !pred(); i++) await new Promise((r) => setTimeout(r, 100));
      expect(pred()).toBe(true);
    };
    const count = (pred: (m: { level: string; msg: string }) => boolean) => messages.filter(pred).length;
    const loaded = (m: { msg: string }) => m.msg.startsWith('Loaded');
    const failed = (m: { level: string; msg: string }) => m.level === 'error' && m.msg.includes('handler exploded');

    explode = true;
    fs.appendFileSync(path.join(site, 'content', 'index.md'), '\nEdit 1.\n');
    watcher.emit('all', 'change', path.join(site, 'content', 'index.md'));
    await waitFor(() => count(failed) === 1);
    expect(entries.size).toBe(2); // previous pages still served
    expect(entries.get('index').rendered.html).not.toContain('Edit 1.');

    explode = false;
    const before = count(loaded);
    fs.appendFileSync(path.join(site, 'content', 'index.md'), '\nEdit 2.\n');
    watcher.emit('all', 'change', path.join(site, 'content', 'index.md'));
    await waitFor(() => count(loaded) === before + 1);
    expect(entries.get('index').rendered.html).toContain('Edit 2.');

    // Changes inside _build or public/ never trigger rebuilds
    const recompiles = count((m) => m.msg.includes('recompiling'));
    watcher.emit('all', 'change', path.join(site, 'content', '_build', 'site', 'config.json'));
    watcher.emit('all', 'change', path.join(site, 'public', '_myst', 'book', 'x.svg'));
    await new Promise((r) => setTimeout(r, 400));
    expect(count((m) => m.msg.includes('recompiling'))).toBe(recompiles);
  });
});
