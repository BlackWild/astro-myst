/** URL helpers that map MyST URLs onto an Astro site. Pure functions, easy to test. */

export type TrailingSlash = 'always' | 'never' | 'ignore';

export function joinUrl(...parts: string[]): string {
  const joined = parts
    .filter((p) => p !== '')
    .join('/')
    .replace(/\/{2,}/g, '/');
  return joined.startsWith('/') ? joined : `/${joined}`;
}

/** Where the pages of a collection are served: a URL prefix, or a function from entry id to path. */
export type MystRoute = string | ((id: string) => string);

/** Path of an entry below Astro's `base`: the route prefix plus the id, the `index` entry at the prefix itself. */
export function routeFor(route: MystRoute, id: string): string {
  if (typeof route === 'function') return joinUrl(route(id));
  return joinUrl(route, id === 'index' ? '' : id);
}

/** Absolute URL of a page whose path below Astro's `base` is `route`, honouring `trailingSlash`. */
export function pageUrl(opts: { base: string; trailingSlash: TrailingSlash }, route: string): string {
  let url = joinUrl(opts.base, route);
  if (url !== '/' && opts.trailingSlash !== 'always') url = url.replace(/\/$/, '');
  if (opts.trailingSlash === 'always' && !url.endsWith('/')) url += '/';
  return url;
}

/** Public URL of a MyST asset ("/name-<hash>.png") served from `<base>/<assetsDir>`. */
export function assetUrl(opts: { base: string; assetsDir: string }, url: string): string {
  if (!url || /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return url; // absolute, protocol-relative, data:, anchors
  return joinUrl(opts.base, opts.assetsDir, url);
}
