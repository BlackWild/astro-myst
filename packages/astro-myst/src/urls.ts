/** URL helpers that map MyST URLs onto an Astro site. Pure functions, easy to test. */

export type TrailingSlash = 'always' | 'never' | 'ignore';

export function joinUrl(...parts: string[]): string {
  const joined = parts
    .filter((p) => p !== '')
    .join('/')
    .replace(/\/{2,}/g, '/');
  return joined.startsWith('/') ? joined : `/${joined}`;
}

/** URL of a page whose route path (relative to `routeBase`) is `path` ("" = index). */
export function pageUrl(opts: { base: string; routeBase: string; trailingSlash: TrailingSlash }, path: string): string {
  let url = joinUrl(opts.base, opts.routeBase, path);
  if (url !== '/' && opts.trailingSlash !== 'always') url = url.replace(/\/$/, '');
  if (opts.trailingSlash === 'always' && !url.endsWith('/')) url += '/';
  return url;
}

/** Public URL of a MyST asset ("/name-<hash>.png") copied to `public/<assetsDir>`. */
export function assetUrl(opts: { base: string; assetsDir: string }, url: string): string {
  if (!url || /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return url; // absolute, protocol-relative, data:, anchors
  return joinUrl(opts.base, opts.assetsDir, url);
}

/**
 * Route path of a MyST page slug ("" for the project index). Mirrors mystmd's
 * `slugToUrl`: with `site.options.folders: true` slugs look like
 * "chapter-1.intro" and map to "chapter-1/intro"; "chapter-1.index" maps to "chapter-1".
 */
export function slugToPath(slug: string, indexSlug: string): string {
  if (slug === indexSlug) return '';
  return slug.replace(/\.index$/, '').replace(/\./g, '/');
}

/** MyST's own URL for a page slug ("/" for the index, "/theory" otherwise). */
export function slugToMystUrl(slug: string, indexSlug: string): string {
  return `/${slugToPath(slug, indexSlug)}`;
}
