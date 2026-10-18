/**
 * Astro Content Layer loader for MyST. Like Astro's `glob()` loader, every matching file in a
 * folder becomes an entry; the files are compiled together by mystmd (in a project generated in
 * Astro's cache folder), so numbering, cross-references between pages and citations work, and
 * entries carry pre-rendered HTML for `render(entry)`.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Loader, LoaderContext } from 'astro/loaders';
import { ASSETS_DIR, isInside } from './assets.js';
import { compileMystProject, readMystBuild, resolveCommand } from './compile.js';
import type { MystProjectOptions } from './integration.js';
import {
  createProjectConfig,
  DEFAULT_PATTERN,
  entryIdFromPath,
  findSources,
  IGNORED_DIRS,
  type MystTocEntry,
  readFrontmatter,
  writeProject,
} from './project.js';
import { type MarkdownHeading, type MystRenderSettings, renderMystPage } from './render.js';
import { mystSchema } from './schema.js';
import { getState } from './state.js';
import type { MystBuild } from './types.js';
import { assetUrl, type MystRoute, pageUrl, routeFor, type TrailingSlash } from './urls.js';
import { VERSION } from './version.js';

export interface MystLoaderOptions extends MystRenderSettings {
  /** Folder with the collection's files, relative to the Astro project root (as for `glob()`). */
  base: string;
  /** Glob(s) of the files below `base` that become entries. Default: Markdown and notebooks whose name does not start with `_`. */
  pattern?: string | string[];
  /**
   * Order and nesting of the pages, like the `toc` of a myst.yml, with paths relative to `base`.
   * The first entry is the root page. Files matched by `pattern` but not listed follow at the end.
   * Without it, `index` comes first, then the other files alphabetically.
   */
  toc?: MystTocEntry[];
  /**
   * Where you serve the pages, so that links between them work: a URL prefix (entry `index` is
   * served at the prefix itself) or a function from entry id to path. Default: `/<collection name>`.
   */
  route?: MystRoute;
  /** MyST project options for this collection, merged over the integration's `project`. */
  project?: MystProjectOptions;
  /** Extra `myst build` flags for this collection, e.g. `["--execute"]`. */
  args?: string[];
  /**
   * Files or folders outside `base` that pages read (e.g. `{include} ../README.md`), relative to
   * the Astro root. They are watched in dev and part of the cache key.
   */
  extraInputs?: string[];
  /** Custom entry ids, as for `glob()`. `entry` is the file path relative to `base`, `data` its frontmatter. */
  generateId?: (options: { entry: string; base: URL; data: Record<string, unknown> }) => string;
  /** Reuse the previous mystmd build while no input changed. Default: `true`. */
  cache?: boolean;
}

type StoreEntry = Parameters<LoaderContext['store']['set']>[0] & {
  rendered: { html: string; metadata: { headings: MarkdownHeading[]; frontmatter: Record<string, unknown> } };
};

/** Frontmatter strings, with empty values (e.g. from an unsupported LaTeX macro) treated as missing. */
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const posix = (p: string) => p.split(path.sep).join('/');
const definedOnly = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

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
      for (const name of fs.readdirSync(full).sort()) if (!IGNORED_DIRS.includes(name)) visit(path.join(full, name));
    } else if (st.isFile()) {
      hash.update(`${full}\0${st.size}\0${st.mtimeMs}\n`);
    }
  };
  inputs.forEach(visit);
  return hash.digest('hex');
}

/** Copy the assets the pages use from mystmd's output to `dir`, replacing its previous contents. */
function publishAssets(publicDir: string, used: Set<string>, dir: string) {
  const tmp = `${dir}.tmp`;
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  for (const rel of used) {
    const src = path.join(publicDir, ...rel.split('/'));
    if (!isInside(src, publicDir) || !fs.existsSync(src)) continue;
    const dest = path.join(tmp, ...rel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.renameSync(tmp, dir);
}

/**
 * Load a folder of MyST files (Markdown, notebooks, LaTeX) into a content collection.
 * Needs the astro-myst integration in astro.config.
 *
 * ```ts
 * // src/content.config.ts
 * import { defineCollection } from 'astro:content';
 * import { mystLoader } from 'astro-myst';
 * export const collections = { blog: defineCollection({ loader: mystLoader({ base: './src/content/blog' }) }) };
 * ```
 */
export function mystLoader(options: MystLoaderOptions) {
  return {
    name: 'astro-myst',
    schema: mystSchema,
    async load(ctx: LoaderContext) {
      const state = getState();
      if (!state) {
        throw new Error(
          '[astro-myst] mystLoader() needs the astro-myst integration: add `integrations: [myst()]` to astro.config (`import myst from "astro-myst"`).',
        );
      }
      const { config, logger, store, meta, parseData, watcher, collection, generateDigest } = ctx;
      const global = state.options;
      const astroRoot = fileURLToPath(config.root);
      const baseDir = path.resolve(astroRoot, options.base);
      const projectDir = path.join(fileURLToPath(config.cacheDir), 'astro-myst', collection.replace(/[^\w.-]+/g, '-'));
      const assetsDir = path.join(projectDir, 'assets');
      const settings: MystRenderSettings = {
        codeThemes: options.codeThemes ?? global.codeThemes,
        numberedCitations: options.numberedCitations ?? global.numberedCitations,
        handlers: { ...global.handlers, ...options.handlers },
        labels: { ...global.labels, ...options.labels },
      };
      const project = { ...global.project, ...options.project };
      const args = [...(global.args ?? []), ...(options.args ?? [])];
      const urlOpts = { base: config.base ?? '/', trailingSlash: (config.trailingSlash ?? 'ignore') as TrailingSlash };
      const assetsUrlDir = `${ASSETS_DIR}/${collection}`;
      const route = options.route ?? `/${collection}`;
      const extraInputs = (options.extraInputs ?? []).map((p) => path.resolve(astroRoot, p));
      // Never treat Astro's own folders or the generated project as inputs.
      const excluded = [
        fileURLToPath(config.publicDir),
        fileURLToPath(config.outDir),
        fileURLToPath(config.cacheDir),
        path.join(astroRoot, '.astro'),
        path.join(astroRoot, 'node_modules'),
      ].filter((dir) => !isInside(baseDir, dir)); // unless it contains the content itself
      let inputs = [baseDir, ...extraInputs];

      const compile = async (force: boolean): Promise<MystBuild> => {
        if (!fs.existsSync(baseDir)) throw new Error(`The content folder ${options.base} does not exist.`);
        const sources = await findSources(baseDir, options.pattern ?? DEFAULT_PATTERN);
        const projectConfig = await createProjectConfig({
          collection,
          astroRoot,
          baseDir,
          projectDir,
          sources,
          toc: options.toc,
          project,
        });
        inputs = [baseDir, ...extraInputs, ...projectConfig.inputs];
        watcher?.add(inputs);
        const { label } = resolveCommand({ root: projectDir, resolveFrom: astroRoot, command: global.command });
        const key = fingerprint(inputs, excluded, { v: VERSION, label, args, yaml: projectConfig.yaml });
        const hasOutput = fs.existsSync(path.join(projectDir, '_build', 'site', 'config.json'));
        if (options.cache !== false && !force && hasOutput && meta.get('fingerprint') === key) {
          logger.info('MyST sources unchanged; reusing the previous mystmd build');
          return readMystBuild(projectDir, logger, label);
        }
        writeProject(projectDir, projectConfig, collection);
        const build = await compileMystProject({
          root: projectDir,
          resolveFrom: astroRoot,
          command: global.command,
          args,
          logger,
        });
        meta.set('fingerprint', key);
        return build;
      };

      const prepare = async (build: MystBuild) => {
        const mystProject = build.config.projects?.[0];
        if (!mystProject) throw new Error('mystmd produced no project.');
        const indexSlug: string = mystProject.index ?? 'index';
        const toc = [{ slug: indexSlug, level: 1 }, ...(mystProject.pages ?? []).filter((p: any) => p.slug)];

        // First pass: which file each page comes from, its entry id and URL.
        const pages = [];
        const byMystUrl = new Map<string, string>();
        const ids = new Map<string, string>();
        for (const { slug, level, enumerator } of toc) {
          const page = build.pages.get(slug);
          if (!page) continue;
          const file = path.join(projectDir, page.location);
          if (isInside(file, projectDir)) continue; // the generated placeholder root page
          const rel = posix(path.relative(baseDir, file));
          const text = /\.ipynb$/i.test(file) ? undefined : fs.readFileSync(file, 'utf8');
          const { data: raw, body }: { data: Record<string, unknown>; body?: string } =
            text !== undefined && /\.md$/i.test(file) ? readFrontmatter(text) : { data: {}, body: text };
          const id = options.generateId
            ? options.generateId({ entry: rel, base: pathToFileURL(`${baseDir}${path.sep}`), data: raw })
            : entryIdFromPath(rel, raw);
          if (ids.has(id)) throw new Error(`${rel} and ${ids.get(id)} both have the entry id "${id}".`);
          ids.set(id, rel);
          const url = pageUrl(urlOpts, routeFor(route, id));
          byMystUrl.set(slug === indexSlug ? '/' : `/${slug}`, url);
          pages.push({ page, file, rel, raw, body, id, url, level: level ?? 1, enumerator });
        }

        // Second pass: render, keeping track of the assets the pages use.
        const used = new Set<string>();
        const resolveAssetUrl = (u: string) => {
          const out = assetUrl({ base: urlOpts.base, assetsDir: assetsUrlDir }, u);
          if (out !== u) used.add(u.replace(/^\/+/, '').split(/[?#]/)[0]);
          return out;
        };
        const readAsset = (u: string) => {
          const file = path.join(build.publicDir, ...u.split('/').filter(Boolean));
          if (!isInside(file, build.publicDir)) return undefined;
          try {
            return fs.readFileSync(file, 'utf8');
          } catch {
            return undefined;
          }
        };
        const entries: StoreEntry[] = [];
        for (const [order, { page, file, raw, body, id, url, level, enumerator }] of pages.entries()) {
          const { html, headings } = await renderMystPage(page, {
            ...settings,
            resolvePageUrl: (mystUrl) => byMystUrl.get(mystUrl.replace(/\/+$/, '') || '/'),
            resolveAssetUrl,
            readAsset,
          });
          const fm = page.frontmatter ?? {};
          const affiliation = (aid: string) => fm.affiliations?.find((a: any) => a.id === aid)?.name ?? aid;
          const data = {
            ...raw,
            ...definedOnly({
              title: str(fm.title) ?? str(raw.title) ?? id,
              subtitle: str(fm.subtitle),
              short_title: str(fm.short_title),
              description: str(fm.description),
              date: fm.date,
              tags: fm.tags,
              keywords: fm.keywords,
              authors: fm.authors?.map((a: any) => ({ ...a, affiliations: (a.affiliations ?? []).map(affiliation) })),
              thumbnail: fm.thumbnail ? resolveAssetUrl(fm.thumbnail) : undefined,
              banner: fm.banner ? resolveAssetUrl(fm.banner) : undefined,
              doi: fm.doi,
            }),
            myst: definedOnly({
              url,
              order,
              level,
              enumerator: fm.enumerator ?? enumerator,
              kind: page.kind ?? 'Article',
            }),
          };
          entries.push({
            id,
            data: await parseData({ id, data, filePath: file }),
            body,
            filePath: posix(path.relative(astroRoot, file)),
            digest: generateDigest({ sha: page.sha256 ?? '', html, data: JSON.stringify(data) }),
            rendered: { html, metadata: { headings, frontmatter: fm } },
          });
        }
        return { entries, used };
      };

      const sync = async (force = false) => {
        try {
          const build = await compile(force);
          const { entries, used } = await prepare(build); // render everything before touching the store
          publishAssets(build.publicDir, used, assetsDir);
          getState()?.assets.set(collection, assetsDir);
          store.clear();
          for (const entry of entries) store.set(entry);
          logger.info(`Loaded ${entries.length} MyST pages from ${posix(path.relative(astroRoot, baseDir)) || '.'}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!watcher) throw new Error(message.startsWith('[astro-myst]') ? message : `[astro-myst] ${message}`); // fail `astro build`
          logger.error(`${message}\nKeeping the previously loaded MyST pages.`); // keep `astro dev` alive
        }
      };

      await sync();

      // Dev server: recompile when anything the collection reads changes.
      if (watcher) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let queue: Promise<void> = Promise.resolve();
        watcher.on('all', (_event, changed) => {
          const full = path.resolve(changed);
          if (!inputs.some((p) => isInside(full, p))) return;
          if (excluded.some((dir) => isInside(full, dir)) || isInside(full, projectDir)) return;
          if (
            isInside(full, baseDir) &&
            path
              .relative(baseDir, full)
              .split(/[\\/]/)
              .some((part) => IGNORED_DIRS.includes(part))
          ) {
            return;
          }
          clearTimeout(timer);
          timer = setTimeout(() => {
            queue = queue
              .then(() => {
                logger.info(`${posix(path.relative(astroRoot, full))} changed; recompiling the MyST collection`);
                return sync(true);
              })
              .catch((err) => logger.error(String(err)));
          }, 200);
        });
      }
    },
  } satisfies Loader;
}
