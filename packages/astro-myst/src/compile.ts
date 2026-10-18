/**
 * Runs the official MyST compiler (`myst build --site`) on a MyST project and
 * collects its output: one fully-resolved AST (mdast) per page plus the site
 * manifest. Parsing, directives/roles, numbering, cross-page reference
 * resolution, citations, math (KaTeX), includes and notebooks all happen
 * inside mystmd itself.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import type { MystBuild, MystLogger, MystPageJson } from './types.js';

export interface CompileOptions {
  /** Absolute path of the MyST project (the folder containing myst.yml). */
  root: string;
  /** Folder from which the `mystmd` npm package is resolved first. Defaults to `root`. */
  resolveFrom?: string;
  /**
   * Executable to run instead of the `mystmd` npm package, e.g. `"myst"` from
   * pip/conda or `"jupyter-book"`. It must support `build --site`.
   */
  command?: string;
  /** Extra CLI flags, e.g. `["--execute"]` or `["--strict"]`. */
  args?: string[];
  /**
   * The Astro site replaces MyST's React theme, so it never needs downloading.
   * When true (default) a stub site template is placed in `_build/templates`
   * for the duration of the build, which keeps `myst build --site` offline.
   * An existing (real) template is never touched.
   */
  skipThemeDownload?: boolean;
  logger: MystLogger;
}

/** Page JSON format versions this package has been tested with (mystmd 1.3 – 1.11). */
const SUPPORTED_PAGE_VERSIONS = new Set([2, 3]);

/** Resolve how to invoke mystmd: explicit command, the npm package, or `myst` on PATH. */
export function resolveCommand(opts: Pick<CompileOptions, 'command' | 'resolveFrom' | 'root'>): {
  cmd: string;
  args: string[];
  label: string;
} {
  if (opts.command) return { cmd: opts.command, args: [], label: opts.command };
  // Prefer the project's own mystmd, then one installed next to astro-myst.
  const bases = [opts.resolveFrom, opts.root, path.dirname(fileURLToPath(import.meta.url))].filter(Boolean) as string[];
  for (const base of bases) {
    try {
      const require = createRequire(path.join(base, 'noop.js'));
      const pkgJsonPath = require.resolve('mystmd/package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.myst;
      if (bin)
        return {
          cmd: process.execPath,
          args: [path.join(path.dirname(pkgJsonPath), bin)],
          label: `mystmd@${pkg.version}`,
        };
    } catch {
      /* try the next location */
    }
  }
  // Fall back to a `myst` on PATH (e.g. `pip install mystmd`).
  return { cmd: 'myst', args: [], label: 'myst (PATH)' };
}

function readMystYml(root: string): any {
  try {
    return parseYaml(fs.readFileSync(path.join(root, 'myst.yml'), 'utf8')) ?? {};
  } catch {
    return {}; // unreadable myst.yml: mystmd itself will report it
  }
}

/** Mirror of myst-templates' name normalisation for site templates. */
function siteTemplateDir(root: string): string | undefined {
  const template = String(readMystYml(root).site?.template ?? 'book-theme');
  if (/^https?:\/\//.test(template)) return undefined; // remote zip: leave alone
  if (fs.existsSync(path.resolve(root, template))) return undefined; // local template folder
  let normalized = template;
  if (/^[\w-]+$/.test(template)) normalized = `site/myst/${template}`;
  else if (/^[\w-]+\/[\w-]+$/.test(template)) normalized = `site/${template}`;
  return path.join(root, '_build', 'templates', ...normalized.split('/'));
}

const STUB_MARKER = '.astro-myst-stub';

function seedStubTemplate(dir: string): boolean {
  if (fs.existsSync(path.join(dir, 'template.yml'))) return false;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'template.yml'), 'myst: v1\nkind: site\n');
  fs.writeFileSync(path.join(dir, STUB_MARKER), 'Temporary stub created by astro-myst.\n');
  return true;
}

function removeStubTemplate(dir: string) {
  if (fs.existsSync(path.join(dir, STUB_MARKER))) fs.rmSync(dir, { recursive: true, force: true });
}

const quoteWin = (s: string) => (/[\s"&|<>^]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const NOT_FOUND = (cmd: string) =>
  new Error(
    `Could not run "${cmd}". Install the "mystmd" npm package (npm i -D mystmd) or set the \`command\` option.`,
  );

function run(cmd: string, args: string[], cwd: string, logger: MystLogger): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
    // .cmd/.bat shims on Windows (e.g. a pip-installed `myst`) need a shell.
    const shell = process.platform === 'win32' && !/\.exe$/i.test(cmd);
    const child = shell
      ? spawn([cmd, ...args].map(quoteWin).join(' '), { cwd, env, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
      : spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const errors: string[] = [];
    const lines: string[] = [];
    const handle = (line: string) => {
      const msg = line.trim();
      if (!msg || msg.startsWith('building myst-cli session')) return;
      lines.push(msg);
      // Frontmatter keys MyST does not know are the site's own (pubDate, draft, ...), validated by the collection schema.
      if (msg.startsWith('⚠️') && !msg.includes("'frontmatter' extra keys ignored")) logger.warn(msg);
      else if (msg.startsWith('⛔') || /^error\b/i.test(msg)) {
        errors.push(msg);
        logger.error(msg);
      } else logger.debug(msg);
    };
    // Re-assemble lines split across chunks before classifying them.
    const reader = () => {
      let pending = '';
      return {
        data: (buf: Buffer) => {
          const parts = (pending + buf.toString('utf8')).split(/\r?\n/);
          pending = parts.pop() ?? '';
          parts.forEach(handle);
        },
        end: () => {
          if (pending) handle(pending);
          pending = '';
        },
      };
    };
    const out = reader();
    const err = reader();
    child.stdout.on('data', out.data);
    child.stderr.on('data', err.data);
    child.on('error', (e: NodeJS.ErrnoException) => reject(e.code === 'ENOENT' ? NOT_FOUND(cmd) : e));
    child.on('close', (code) => {
      out.end();
      err.end();
      if (code === 0) resolve(lines);
      else if (shell && lines.some((l) => /is not recognized as an internal or external command/i.test(l)))
        reject(NOT_FOUND(cmd));
      else
        reject(
          new Error(`myst build --site failed (exit code ${code})${errors.length ? `:\n${errors.join('\n')}` : ''}`),
        );
    });
  });
}

function readJson<T = any>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/** One build at a time per MyST project: concurrent builds would share `_build/site`. */
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(fn);
  locks.set(key, next);
  next.then(
    () => locks.get(key) === next && locks.delete(key),
    () => locks.get(key) === next && locks.delete(key),
  );
  return next;
}

/** Compile a MyST project with `myst build --site` and read the results. */
export function compileMystProject(opts: CompileOptions): Promise<MystBuild> {
  const root = path.resolve(opts.root);
  return withLock(root, async () => {
    const { logger } = opts;
    if (!fs.existsSync(path.join(root, 'myst.yml'))) {
      throw new Error(`No myst.yml found in ${root}: compileMystProject() needs a MyST project folder.`);
    }
    const siteDir = path.join(root, '_build', 'site');
    // Start from a clean site folder so deleted pages and stale assets disappear.
    fs.rmSync(siteDir, { recursive: true, force: true });

    const stubDir = opts.skipThemeDownload === false ? undefined : siteTemplateDir(root);
    const seeded = stubDir ? seedStubTemplate(stubDir) : false;

    const { cmd, args, label } = resolveCommand({ ...opts, root });
    const started = performance.now();
    let output: string[];
    try {
      output = await run(cmd, [...args, 'build', '--site', ...(opts.args ?? [])], root, logger);
    } finally {
      if (seeded && stubDir) removeStubTemplate(stubDir);
    }
    if (output.some((line) => line.includes('No site configuration found'))) {
      throw new Error(
        `${path.join(root, 'myst.yml')} has no \`site:\` section, which \`myst build --site\` needs. ` +
          'Add `site: {}` to myst.yml (`myst init` creates one for you).',
      );
    }
    const build = readMystBuild(root, logger, label);
    logger.info(`${label} compiled ${build.pages.size} pages in ${Math.round(performance.now() - started)} ms`);
    return build;
  });
}

/** Read the output of a previous `myst build --site` from `<root>/_build/site`. */
export function readMystBuild(root: string, logger: MystLogger, label = 'myst'): MystBuild {
  const siteDir = path.join(root, '_build', 'site');
  const configPath = path.join(siteDir, 'config.json');
  const contentDir = path.join(siteDir, 'content');
  if (!fs.existsSync(configPath) || !fs.existsSync(contentDir)) {
    throw new Error(`${label} did not produce ${path.relative(root, siteDir)}/config.json; is this a MyST project?`);
  }
  const config = readJson(configPath);
  const pages = new Map<string, MystPageJson>();
  const untested = new Set<number>();
  // Single-project sites write content/<slug>.json; multi-project sites content/<project>/<slug>.json.
  const walk = (dir: string, prefix: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      else if (entry.name.endsWith('.json')) {
        const page = readJson<MystPageJson>(path.join(dir, entry.name));
        if (page.version !== undefined && !SUPPORTED_PAGE_VERSIONS.has(page.version)) untested.add(page.version);
        pages.set(`${prefix}${page.slug}`, page);
      }
    }
  };
  walk(contentDir, '');
  for (const version of untested) {
    logger.warn(`${label} writes MyST page format version ${version}, which astro-myst has not been tested with.`);
  }
  const xrefPath = path.join(siteDir, 'myst.xref.json');
  return {
    config,
    pages,
    publicDir: path.join(siteDir, 'public'),
    xref: fs.existsSync(xrefPath) ? readJson(xrefPath) : undefined,
  };
}
