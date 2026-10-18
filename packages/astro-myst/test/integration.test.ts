import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import myst from '../src/integration.js';
import { getState } from '../src/state.js';
import { setupIntegration } from './helpers.js';

const logger = { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined };

/** Call the dev-server middleware the integration registers, like Vite's connect stack would. */
function request(integration: ReturnType<typeof myst>, url: string, method = 'GET') {
  let middleware: any;
  (integration.hooks['astro:server:setup'] as (params: unknown) => void)({
    server: { middlewares: { use: (fn: unknown) => (middleware = fn) } },
  });
  return new Promise<{ next: boolean; headers: Record<string, unknown>; body: string }>((resolve) => {
    const chunks: Buffer[] = [];
    const headers: Record<string, unknown> = {};
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    Object.assign(res, { setHeader: (key: string, value: unknown) => (headers[key.toLowerCase()] = value) });
    res.on('finish', () => resolve({ next: false, headers, body: Buffer.concat(chunks).toString() }));
    middleware({ method, url }, res, () => resolve({ next: true, headers, body: '' }));
  });
}

describe('integration', () => {
  it('adds KaTeX and base styles to every page by default', () => {
    expect(setupIntegration().scripts).toEqual([
      ['page-ssr', "import 'astro-myst/katex.css';\nimport 'astro-myst/base.css';"],
    ]);
    expect(setupIntegration({ styles: 'theme' }).scripts[0][1]).toContain("import 'astro-myst/theme.css';");
    expect(setupIntegration({ styles: false }).scripts).toEqual([]);
    expect(() => myst({ styles: 'fancy' as any })).toThrow(/Unknown `styles` option "fancy"/);
  });

  it('shares its options with the loaders', () => {
    setupIntegration({ project: { numbering: { headings: true } }, numberedCitations: true });
    expect(getState()?.options).toMatchObject({ project: { numbering: { headings: true } }, numberedCitations: true });
    expect(getState()?.assets.size).toBe(0);
  });

  it('serves MyST assets in dev, below `base`, and nothing else', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-assets-'));
    fs.mkdirSync(path.join(dir, 'sub'));
    fs.writeFileSync(path.join(dir, 'dot-123.svg'), '<svg/>');
    fs.writeFileSync(path.join(dir, 'sub', 'data.csv'), 'a,b');
    fs.writeFileSync(path.join(path.dirname(dir), 'secret.txt'), 'no');
    const { integration } = setupIntegration({}, '/docs/');
    getState()?.assets.set('book', dir);

    const svg = await request(integration, '/docs/_myst/book/dot-123.svg');
    expect(svg).toMatchObject({ next: false, body: '<svg/>' });
    expect(svg.headers['content-type']).toBe('image/svg+xml');
    // Some dev servers strip `base` before middlewares run.
    expect((await request(integration, '/_myst/book/sub/data.csv?x=1')).body).toBe('a,b');
    expect((await request(integration, '/docs/_myst/book/dot-123.svg', 'HEAD')).headers['content-length']).toBe(6);

    for (const url of [
      '/docs/_myst/book/missing.svg',
      '/docs/_myst/other/dot-123.svg',
      '/docs/_myst/book/..%2Fsecret.txt',
      '/docs/page',
      '/docs/_myst/book/%E0%A4%A',
    ]) {
      expect((await request(integration, url)).next, url).toBe(true);
    }
    expect((await request(integration, '/docs/_myst/book/dot-123.svg', 'POST')).next).toBe(true);
  });

  it('copies the assets into the build output once', async () => {
    const assets = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-assets-'));
    fs.writeFileSync(path.join(assets, 'fig-1.png'), 'png');
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-out-'));
    fs.mkdirSync(path.join(out, '_myst', 'book', 'stale'), { recursive: true });
    const { integration } = setupIntegration();
    getState()?.assets.set('book', assets);
    const messages: string[] = [];
    const log = { ...logger, info: (m: string) => messages.push(m) };
    const dir = pathToFileURL(`${out}/`);
    await (integration.hooks['astro:build:generated'] as any)({ dir, logger: log });
    await (integration.hooks['astro:build:done'] as any)({ dir, logger: log });
    expect(fs.readdirSync(path.join(out, '_myst', 'book'))).toEqual(['fig-1.png']);
    expect(messages).toEqual(['Copied 1 MyST assets to _myst/']);
  });
});
