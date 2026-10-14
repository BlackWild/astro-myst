import { describe, expect, it } from 'vitest';
import { assetUrl, joinUrl, pageUrl, slugToMystUrl, slugToPath } from '../src/urls.js';

describe('joinUrl', () => {
  it('joins and normalises slashes', () => {
    expect(joinUrl('/', '/', 'theory')).toBe('/theory');
    expect(joinUrl('/docs/', '/book/', '')).toBe('/docs/book/');
    expect(joinUrl('docs', 'a')).toBe('/docs/a');
  });
});

describe('pageUrl', () => {
  const opts = { base: '/', routeBase: '/', trailingSlash: 'ignore' as const };
  it('maps the index and pages', () => {
    expect(pageUrl(opts, '')).toBe('/');
    expect(pageUrl(opts, 'theory')).toBe('/theory');
    expect(pageUrl(opts, 'part-1/intro')).toBe('/part-1/intro');
  });
  it('respects base, routeBase and trailingSlash', () => {
    expect(pageUrl({ base: '/docs', routeBase: '/book/', trailingSlash: 'never' }, '')).toBe('/docs/book');
    expect(pageUrl({ base: '/docs', routeBase: '/', trailingSlash: 'always' }, 'theory')).toBe('/docs/theory/');
    expect(pageUrl({ base: '/docs/', routeBase: '/', trailingSlash: 'always' }, '')).toBe('/docs/');
  });
});

describe('assetUrl', () => {
  const opts = { base: '/docs', assetsDir: '_myst/book' };
  it('prefixes MyST public assets', () => {
    expect(assetUrl(opts, '/fig-abc123.png')).toBe('/docs/_myst/book/fig-abc123.png');
  });
  it('leaves absolute, protocol-relative, data and anchor URLs alone', () => {
    for (const u of ['https://x.org/a.png', '//cdn.org/a.png', 'data:image/png;base64,AAA', '#frag', 'mailto:a@b.c']) {
      expect(assetUrl(opts, u)).toBe(u);
    }
  });
});

describe('slugToPath / slugToMystUrl', () => {
  it('mirrors mystmd slugToUrl, including folder slugs', () => {
    expect(slugToPath('index', 'index')).toBe('');
    expect(slugToPath('theory', 'index')).toBe('theory');
    expect(slugToPath('chapter-1.intro', 'index')).toBe('chapter-1/intro');
    expect(slugToPath('chapter-1.index', 'index')).toBe('chapter-1');
    expect(slugToMystUrl('index', 'index')).toBe('/');
    expect(slugToMystUrl('chapter-1.intro', 'index')).toBe('/chapter-1/intro');
  });
});
