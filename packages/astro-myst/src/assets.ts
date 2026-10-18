/**
 * Images, videos and downloads of MyST pages are served from `<base>/_myst/<collection>/`:
 * by the dev server straight from Astro's cache folder, and copied into the build output.
 * Nothing is written to public/.
 */
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';

/** URL folder (below Astro's `base`) and build-output folder of MyST assets. */
export const ASSETS_DIR = '_myst';

const TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.bib': 'text/x-bibtex; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.ipynb': 'application/x-ipynb+json',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tex': 'text/x-tex; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.zip': 'application/zip',
};

export const contentType = (file: string) => TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

export const isInside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

/**
 * Dev-server middleware serving `[base]/_myst/<collection>/<file>` from the folder that
 * `assetsFolder(collection)` returns. Other requests, and missing files, go to the next handler.
 */
export function assetsMiddleware(base: string, assetsFolder: (collection: string) => string | undefined) {
  const basePath = base.replace(/\/+$/, '');
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      return next();
    }
    // The dev server may or may not have removed `base` from the URL already.
    if (basePath && pathname.startsWith(`${basePath}/`)) pathname = pathname.slice(basePath.length);
    const match = new RegExp(`^/${ASSETS_DIR}/([^/]+)/(.+)$`).exec(pathname);
    const dir = match ? assetsFolder(match[1]) : undefined;
    if (!match || !dir) return next();
    const file = path.join(dir, ...match[2].split('/'));
    if (!isInside(file, dir)) return next();
    fs.stat(file, (err, stats) => {
      if (err || !stats.isFile()) return next();
      res.setHeader('Content-Type', contentType(file));
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'no-cache');
      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(file).pipe(res);
    });
  };
}

/** Copy each collection's assets to `<outDir>/_myst/<collection>/`. Returns the number of files. */
export function copyAssets(outDir: string, folders: Map<string, string>): number {
  let count = 0;
  for (const [collection, dir] of folders) {
    const target = path.join(outDir, ASSETS_DIR, collection);
    fs.rmSync(target, { recursive: true, force: true });
    if (!fs.existsSync(dir)) continue;
    fs.cpSync(dir, target, { recursive: true });
    count += fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).length;
  }
  return count;
}
