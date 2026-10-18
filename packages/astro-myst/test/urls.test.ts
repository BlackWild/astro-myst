import { describe, expect, it } from 'vitest';
import { assetUrl, joinUrl, pageUrl, routeFor } from '../src/urls.js';

describe('joinUrl', () => {
  it('joins and normalises slashes', () => {
    expect(joinUrl('/', '/', 'theory')).toBe('/theory');
    expect(joinUrl('/docs/', '/book/', '/a')).toBe('/docs/book/a');
    expect(joinUrl('docs', '', 'a')).toBe('/docs/a');
    expect(joinUrl('', '')).toBe('/');
  });
});

describe('routeFor', () => {
  it('serves entries below a prefix, the index at the prefix itself', () => {
    expect(routeFor('/blog', 'first-post')).toBe('/blog/first-post');
    expect(routeFor('/blog/', 'index')).toBe('/blog/');
    expect(routeFor('/', 'index')).toBe('/');
    expect(routeFor('/', 'guides/latex')).toBe('/guides/latex');
  });

  it('accepts a function from id to path', () => {
    expect(routeFor((id) => `posts/${id}.html`, 'a')).toBe('/posts/a.html');
  });
});

describe('pageUrl', () => {
  const opts = { base: '/', trailingSlash: 'ignore' as const };
  it('maps the site root and pages', () => {
    expect(pageUrl(opts, '/')).toBe('/');
    expect(pageUrl(opts, '/theory')).toBe('/theory');
  });

  it('respects base and trailingSlash', () => {
    expect(pageUrl({ base: '/docs', trailingSlash: 'always' }, '/book/theory')).toBe('/docs/book/theory/');
    expect(pageUrl({ base: '/docs/', trailingSlash: 'never' }, '/book/')).toBe('/docs/book');
    expect(pageUrl({ base: '/docs/', trailingSlash: 'always' }, '/')).toBe('/docs/');
    expect(pageUrl({ base: '/docs/', trailingSlash: 'ignore' }, '/')).toBe('/docs');
  });
});

describe('assetUrl', () => {
  const opts = { base: '/docs/', assetsDir: '_myst/book' };
  it('prefixes MyST public assets', () => {
    expect(assetUrl(opts, '/fig-abc123.png')).toBe('/docs/_myst/book/fig-abc123.png');
  });
  it('leaves absolute, protocol-relative, data and anchor URLs alone', () => {
    for (const u of ['https://x.org/a.png', '//cdn/x.png', 'data:image/png;base64,AA', '#sec', 'mailto:a@b.c']) {
      expect(assetUrl(opts, u)).toBe(u);
    }
  });
});
