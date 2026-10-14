/**
 * Astro Content Layer loader that compiles a MyST project with mystmd and stores
 * one entry per page, with pre-rendered HTML so `render(entry)` / `<Content />`
 * work exactly like for regular Markdown collections.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader, LoaderContext } from 'astro/loaders';
import { z } from 'astro/zod';
import { compileMystProject, readMystBuild, resolveCommand } from './compile.js';
import { renderMystPage, type MarkdownHeading, type MystNodeHandler } from './render.js';
import type { MystBuild, MystPageJson } from './types.js';
import { assetUrl, pageUrl, slugToMystUrl, slugToPath, type TrailingSlash } from './urls.js';
import { VERSION } from './version.js';

export interface MystLoaderOptions {
  /** Folder of the MyST project (contains `myst.yml`), relative to the Astro root. */
  root: string;
  /** URL prefix (below Astro's `base`) where you route the pages. Default: `"/"`. */
  routeBase?: string;
  /** Sub-folder of `public/` receiving MyST's images & downloads. Default: `"_myst/<collection>"`. */
  assetsDir?: string;
  /** Executable to use instead of the `mystmd` npm package (e.g. `"myst"` from pip, or `"jupyter-book"`). */
  command?: string;
  /** Extra flags for `myst build --site`, e.g. `["--execute"]` or `["--strict"]`. */
  mystArgs?: string[];
  /** Keep `myst build` offline by never downloading MyST's own React theme. Default: `true`. */
  skipThemeDownload?: boolean;
  /** Skip recompiling when no file in the MyST project changed since the last build. Default: `true`. */
  cache?: boolean;
  /** Shiki themes for code blocks, or `false` to disable highlighting. */
  codeThemes?: { light: string; dark: string } | false;
  /** Override how individual MyST node types are rendered. */
  handlers?: Record<string, MystNodeHandler>;
  /** Heading of the per-page bibliography. Default: `"References"`. */
  bibliographyTitle?: string;
  /** Heading of the per-page footnotes. Default: `"Footnotes"`. */
  footnotesTitle?: string;
  /**
   * Files or folders outside `root` that the MyST project reads (e.g. `{include} ../README.md`,
   * `extends:` configs, a shared `.bib`), relative to the Astro root. They are watched in
   * dev and part of the cache key.
   */
  extraInputs?: string[];
  /** For multi-project MyST sites (`site.projects` in myst.yml): slug of the project to load. Default: the first. */
  project?: string;
}

const author = z
  .object({
    name: z.string().optional(),
    orcid: z.string().optional(),
    email: z.string().optional(),
    corresponding: z.boolean().optional(),
    affiliations: z.array(z.string()).optional(),
  })
  .catchall(z.any());

export const mystPageSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  short_title: z.string().optional(),
  description: z.string().optional(),
  /** Page-title number when `numbering.title` is enabled (e.g. "2.1"). */
  enumerator: z.string().optional(),
  date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  authors: z.array(author).default([]),
  /** Public URL of the page thumbnail, if any. */
  thumbnail: z.string().optional(),
  /** Route path relative to `routeBase` ("" for the project index). Use it as the `[...slug]` param. */
  path: z.string(),
  /** Absolute URL of the page (Astro base + routeBase + path). */
  url: z.string(),
  /** Position in the MyST table of contents (0 = index). */
  order: z.number(),
  /** Nesting level in the MyST table of contents (1 = top level). */
  level: z.number(),
  isIndex: z.boolean(),
  /** "Article" or "Notebook". */
  kind: z.string(),
  /** Source file, relative to the MyST project root. */
  source: z.string(),
  projectTitle: z.string().optional(),
  /** Full, validated MyST frontmatter (numbering, math macros, exports, license, ...). */
  frontmatter: z.record(z.string(), z.any()),
});

export type MystPageData = z.infer<typeof mystPageSchema>;

const IGNORED_NAMES = new Set(['_build', 'node_modules', '.git', '.astro', '.ipynb_checkpoints', '__pycache__', '.venv']);

const isInside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

/** Cheap fingerprint of the given inputs (path, size, mtime), skipping generated folders. */
function fingerprint(inputs: string[], excluded: string[], extra: unknown): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(extra));
  const visit = (full: string) => {
    if (excluded.some((dir) => isInside(full, dir))) return;
    let st: fs.Stats;
    try {
      st = fs.statSync(full);
    } catch {
      hash.update(`${full}\0missing\n`);
      return;
    }
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(full).sort()) if (!IGNORED_NAMES.has(name)) visit(path.join(full, name));
    } else if (st.isFile()) {
      hash.update(`${full}\0${st.size}\0${st.mtimeMs}\n`);
    }
  };
  inputs.forEach(visit);
  return hash.digest('hex');
}

/** Validate `assetsDir` so the loader can never delete anything outside `public/<assetsDir>`. */
function resolveAssetsDir(publicDir: string, assetsDir: string): { dir: string; urlPath: string } {
  const parts = assetsDir.split(/[\\/]+/).filter(Boolean);
  if (!parts.length || parts.some((p) => p === '.' || p === '..')) {
    throw new Error(`[astro-myst] Invalid assetsDir "${assetsDir}": use a sub-folder name such as "_myst".`);
  }
  const dir = path.join(publicDir, ...parts);
  if (!isInside(dir, publicDir) || dir === publicDir) throw new Error(`[astro-myst] assetsDir must be inside public/: "${assetsDir}"`);
  return { dir, urlPath: parts.join('/') };
}

interface PreparedEntry {
  id: string;
  data: Record<string, unknown>;
  filePath: string;
  digest: string;
  rendered: { html: string; metadata: { headings: MarkdownHeading[]; frontmatter: Record<string, unknown> } };
}

/**
 * Load every page of a MyST project into a content collection.
 *
 * ```ts
 * // src/content.config.ts
 * import { defineCollection } from 'astro:content';
 * import { mystLoader } from 'astro-myst';
 * export const collections = { book: defineCollection({ loader: mystLoader({ root: './content' }) }) };
 * ```
 */
export function mystLoader(options: MystLoaderOptions) {
  return {
    name: 'astro-myst',
    schema: mystPageSchema,
    async load(ctx: LoaderContext) {
      const { config, logger, store, meta, parseData, watcher, collection } = ctx;
      const astroRoot = fileURLToPath(config.root);
      const mystRoot = path.resolve(astroRoot, options.root);
      const publicDir = fileURLToPath(config.publicDir);
      const assets = resolveAssetsDir(publicDir, options.assetsDir ?? `_myst/${collection}`);
      const urlOpts = {
        base: config.base ?? '/',
        routeBase: options.routeBase ?? '/',
        trailingSlash: (config.trailingSlash ?? 'ignore') as TrailingSlash,
        assetsDir: assets.urlPath,
      };
      const resolveAsset = (u: string) => assetUrl(urlOpts, u);
      const inputs = [mystRoot, ...(options.extraInputs ?? []).map((p) => path.resolve(astroRoot, p))];
      // Never treat Astro's own folders (or our asset copies) as MyST sources.
      const excluded = [publicDir, fileURLToPath(config.outDir), fileURLToPath(config.cacheDir), path.join(astroRoot, '.astro'), path.join(astroRoot, 'node_modules')]
        .filter((dir) => !isInside(mystRoot, dir)); // never exclude a folder that contains the MyST project itself

      const compileOrReuse = async (force: boolean): Promise<MystBuild> => {
        const { label } = resolveCommand({ root: mystRoot, resolveFrom: astroRoot, command: options.command });
        const key = fingerprint(inputs, excluded, { v: VERSION, label, args: options.mystArgs ?? [], command: options.command });
        const hasOutput = fs.existsSync(path.join(mystRoot, '_build', 'site', 'config.json'));
        if (options.cache !== false && !force && hasOutput && meta.get('source-fingerprint') === key) {
          logger.info('MyST sources unchanged; reusing the previous mystmd build');
          return readMystBuild(mystRoot, logger, label);
        }
        const build = await compileMystProject({
          root: mystRoot,
          resolveFrom: astroRoot,
          command: options.command,
          args: options.mystArgs,
          skipThemeDownload: options.skipThemeDownload,
          logger,
        });
        meta.set('source-fingerprint', key);
        return build;
      };

      const prepare = async (build: MystBuild): Promise<PreparedEntry[]> => {
        const projects: any[] = build.config.projects ?? [];
        const project = options.project ? projects.find((p) => p.slug === options.project) : projects[0];
        if (!project) {
          throw new Error(options.project ? `No MyST project with slug "${options.project}" (found: ${projects.map((p) => p.slug).join(', ')})` : 'The MyST site has no projects');
        }
        if (projects.length > 1 && !options.project) {
          logger.warn(`The MyST site has ${projects.length} projects; loading "${project.slug}". Use the \`project\` option to choose.`);
        }
        const projectSlug: string | undefined = project.slug;
        const projectDir = projectSlug && build.projectPaths[projectSlug] ? path.join(mystRoot, build.projectPaths[projectSlug]) : mystRoot;
        const indexSlug: string = project.index ?? 'index';
        const tocPages: any[] = [{ slug: indexSlug, level: 1 }, ...(project.pages ?? []).filter((p: any) => p.slug)];
        const toc = new Map(tocPages.map((p, i) => [p.slug as string, { ...p, order: i }]));

        // This project's pages, keyed by slug.
        const pages = new Map<string, MystPageJson>();
        for (const [key, page] of build.pages) {
          if (projectSlug && projects.length > 1) {
            if (key.startsWith(`${projectSlug}/`)) pages.set(key.slice(projectSlug.length + 1), page);
          } else if (!key.includes('/')) pages.set(key, page);
        }

        // MyST's page URLs ("/theory", or "/<project>/theory" in multi-project sites) -> Astro URLs
        const mystPrefix = projectSlug && projects.length > 1 ? `/${projectSlug}` : '';
        const normalize = (u: string) => u.replace(/\/+$/, '') || '/';
        const mystUrlToPath = new Map<string, string>();
        for (const slug of pages.keys()) {
          mystUrlToPath.set(normalize(`${mystPrefix}${slugToMystUrl(slug, indexSlug)}`), slugToPath(slug, indexSlug));
        }
        const resolvePageUrl = (mystUrl: string) => {
          const p = mystUrlToPath.get(normalize(mystUrl));
          return p === undefined ? undefined : pageUrl(urlOpts, p);
        };
        const readAsset = (url: string) => {
          const file = path.join(build.publicDir, ...url.split('/').filter(Boolean));
          if (!isInside(file, build.publicDir)) return undefined;
          try {
            return fs.readFileSync(file, 'utf8');
          } catch {
            return undefined;
          }
        };

        const prepared: PreparedEntry[] = [];
        for (const [slug, page] of pages) {
          const fm = page.frontmatter ?? {};
          const entry = toc.get(slug) ?? { order: toc.size + prepared.length, level: 1 };
          const routePath = slugToPath(slug, indexSlug);
          const { html, headings } = await renderMystPage(page, {
            resolvePageUrl,
            resolveAssetUrl: resolveAsset,
            readAsset,
            codeThemes: options.codeThemes,
            handlers: options.handlers,
            bibliographyTitle: options.bibliographyTitle,
            footnotesTitle: options.footnotesTitle,
          });
          const affiliationName = (id: string) => fm.affiliations?.find((a: any) => a.id === id)?.name ?? id;
          const location = (page.location ?? `/${slug}.md`).replace(/^\//, '');
          const data = await parseData({
            id: slug,
            data: {
              title: fm.title ?? slug,
              subtitle: fm.subtitle,
              short_title: fm.short_title,
              description: fm.description,
              enumerator: fm.enumerator ?? entry.enumerator,
              date: fm.date,
              tags: fm.tags,
              keywords: fm.keywords,
              authors: (fm.authors ?? []).map((a: any) => ({ ...a, affiliations: (a.affiliations ?? []).map(affiliationName) })),
              thumbnail: fm.thumbnail ? resolveAsset(fm.thumbnail) : undefined,
              path: routePath,
              url: pageUrl(urlOpts, routePath),
              order: entry.order,
              level: entry.level ?? 1,
              isIndex: slug === indexSlug,
              kind: page.kind ?? 'Article',
              source: path.relative(mystRoot, path.join(projectDir, location)).split(path.sep).join('/'),
              projectTitle: project.title,
              frontmatter: fm,
            },
          });
          prepared.push({
            id: slug,
            data,
            filePath: path.relative(astroRoot, path.join(projectDir, location)).split(path.sep).join('/'),
            digest: ctx.generateDigest({ sha: page.sha256 ?? page, html }),
            rendered: { html, metadata: { headings, frontmatter: fm } },
          });
        }
        return prepared;
      };

      const sync = async (force = false) => {
        try {
          const build = await compileOrReuse(force);
          const entries = await prepare(build); // render everything before touching the store
          fs.rmSync(assets.dir, { recursive: true, force: true });
          if (fs.existsSync(build.publicDir)) fs.cpSync(build.publicDir, assets.dir, { recursive: true });
          store.clear();
          for (const entry of entries) store.set(entry);
          logger.info(`Loaded ${entries.length} MyST pages from ${path.relative(astroRoot, mystRoot) || '.'}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!watcher) throw new Error(message.startsWith('[astro-myst]') ? message : `[astro-myst] ${message}`); // fail `astro build`
          logger.error(`${message}\nKeeping the previously loaded MyST pages.`); // keep `astro dev` alive
        }
      };

      await sync();

      // Dev server: recompile when anything in the MyST project (or extraInputs) changes.
      if (watcher) {
        inputs.forEach((p) => watcher.add(p));
        let timer: ReturnType<typeof setTimeout> | undefined;
        let queue: Promise<void> = Promise.resolve();
        watcher.on('all', (_event, file) => {
          const full = path.resolve(file);
          if (!inputs.some((p) => isInside(full, p))) return;
          if (excluded.some((dir) => isInside(full, dir))) return;
          if (path.relative(mystRoot, full).split(/[\\/]/).some((part) => IGNORED_NAMES.has(part))) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            queue = queue
              .then(() => {
                logger.info(`${path.relative(astroRoot, full)} changed; recompiling MyST project`);
                return sync(true);
              })
              .catch((err) => logger.error(String(err)));
          }, 200);
        });
      }
    },
  } satisfies Loader;
}
