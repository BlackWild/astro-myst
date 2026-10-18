/**
 * A MyST collection is compiled as a MyST project that astro-myst generates in Astro's cache
 * folder: a myst.yml whose table of contents points at the collection's files where they are,
 * so nothing is written next to the content.
 */
import fs from 'node:fs';
import path from 'node:path';
import { slug as githubSlug } from 'github-slugger';
import { glob } from 'tinyglobby';
import { parse as parseYaml, stringify as toYaml } from 'yaml';
import type { MystProjectOptions } from './integration.js';

/** Files of a collection by default: Markdown and notebooks, except names starting with `_` (e.g. included snippets). */
export const DEFAULT_PATTERN = '**/[^_]*.{md,ipynb}';

/** Folders never treated as content. */
export const IGNORED_DIRS = ['node_modules', '_build', '.git', '.astro', '.ipynb_checkpoints', '__pycache__', '.venv'];
const IGNORE = IGNORED_DIRS.map((dir) => `**/${dir}/**`);

/** Root page of the generated project when the collection has no index file of its own. */
export const PLACEHOLDER_INDEX = 'index.md';

/** An entry of a MyST table of contents (https://mystmd.org/guide/table-of-contents), with paths relative to the loader's `base`. */
export interface MystTocEntry {
  file?: string;
  url?: string;
  title?: string;
  /** Glob of files, relative to `base`, added in alphabetical order. */
  pattern?: string;
  children?: MystTocEntry[];
  [key: string]: unknown;
}

const posix = (p: string) => p.split(path.sep).join('/');

/** Files matching `pattern` below `baseDir`, relative to it, sorted. */
export async function findSources(baseDir: string, pattern: string | string[]): Promise<string[]> {
  const files = await glob(pattern, { cwd: baseDir, ignore: IGNORE, onlyFiles: true, expandDirectories: false });
  return files.map(posix).sort();
}

/**
 * Split a Markdown file into its YAML frontmatter and body. Values are parsed like Astro's own
 * Markdown loader does (YAML core schema with timestamps, so dates become `Date`s).
 */
export function readFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const match = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!match) return { data: {}, body: text };
  let data: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(match[1] ?? '', { customTags: ['timestamp'] });
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
  } catch {
    /* invalid YAML: mystmd reports it */
  }
  return { data, body: text.slice(match[0].length) };
}

/**
 * Entry id of a file, exactly like Astro's `glob()` loader: the frontmatter `slug` if there is one,
 * else the path without extension with every segment slugified and a trailing `/index` removed.
 */
export function entryIdFromPath(rel: string, data: Record<string, unknown> = {}): string {
  if (data.slug !== undefined && data.slug !== null && data.slug !== '') return String(data.slug);
  return rel
    .replace(/\.[^./]+$/, '')
    .split('/')
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/, '');
}

export interface ProjectSpec {
  collection: string;
  /** Absolute paths: the Astro project, the collection's content folder and the generated project. */
  astroRoot: string;
  baseDir: string;
  projectDir: string;
  /** The collection's files, relative to `baseDir`, as returned by `findSources`. */
  sources: string[];
  toc?: MystTocEntry[];
  /** Project options, with file paths relative to `astroRoot`. */
  project: MystProjectOptions;
}

export interface ProjectConfig {
  /** Contents of the generated myst.yml. */
  yaml: string;
  /** Whether the generated project needs the placeholder root page. */
  placeholder: boolean;
  /** Local files the project options point to (bibliographies, plugins, ...), absolute. */
  inputs: string[];
}

const isUrl = (value: string) => /^[a-z][a-z0-9+.-]*:/i.test(value);
const PATH_OPTIONS = ['bibliography', 'plugins', 'thumbnail', 'banner'];

/** Build the myst.yml of a collection's generated project. */
export async function createProjectConfig(spec: ProjectSpec): Promise<ProjectConfig> {
  const toProject = (abs: string) => posix(path.relative(spec.projectDir, abs)) || '.';
  const inputs: string[] = [];
  const local = (value: unknown): unknown => {
    if (typeof value === 'string') {
      if (isUrl(value)) return value;
      const abs = path.resolve(spec.astroRoot, value);
      inputs.push(abs);
      return toProject(abs);
    }
    if (Array.isArray(value)) return value.map(local);
    // MyST plugins can also be objects like { type: 'executable', path: 'plugin.py' }
    if (value && typeof value === 'object' && typeof (value as { path?: unknown }).path === 'string') {
      return { ...value, path: local((value as { path: string }).path) };
    }
    return value;
  };

  const project: MystProjectOptions = { id: `astro-myst-${spec.collection}`, ...structuredClone(spec.project) };
  for (const key of PATH_OPTIONS) if (project[key] !== undefined) project[key] = local(project[key]);
  // mystmd finds .bib files in its project folder, which is now the generated one: look in the collection's.
  if (project.bibliography === undefined) {
    const bibs = await findSources(spec.baseDir, '**/*.bib');
    if (bibs.length) project.bibliography = bibs.map((bib) => toProject(path.join(spec.baseDir, bib)));
  }

  const listed = new Set<string>();
  const fileEntry = (rel: string): MystTocEntry => {
    listed.add(rel);
    return { file: toProject(path.join(spec.baseDir, rel)) };
  };
  const mapEntries = async (entries: MystTocEntry[]): Promise<MystTocEntry[]> => {
    const mapped: MystTocEntry[] = [];
    for (const entry of entries) {
      if (typeof entry.pattern === 'string') {
        mapped.push(...(await findSources(spec.baseDir, entry.pattern)).map(fileEntry));
        continue;
      }
      const { file, children, ...rest } = entry;
      const out: MystTocEntry = { ...rest };
      if (typeof file === 'string') Object.assign(out, fileEntry(path.posix.normalize(file.replace(/\\/g, '/'))));
      if (Array.isArray(children)) out.children = await mapEntries(children);
      mapped.push(out);
    }
    return mapped;
  };

  let toc: MystTocEntry[];
  let placeholder: boolean;
  if (spec.toc) {
    // The first entry is the project's root page, as in a myst.yml; files not listed follow.
    toc = await mapEntries(spec.toc);
    toc.push(...spec.sources.filter((rel) => !listed.has(rel)).map(fileEntry));
    placeholder = typeof toc[0]?.file !== 'string';
  } else {
    const index = spec.sources.find((rel) => entryIdFromPath(rel) === 'index');
    placeholder = !index;
    toc = (index ? [index, ...spec.sources.filter((rel) => rel !== index)] : spec.sources).map(fileEntry);
  }
  if (placeholder) toc.unshift({ file: PLACEHOLDER_INDEX });

  const yaml = toYaml({ version: 1, project: { ...project, toc }, site: {} });
  return { yaml, placeholder, inputs };
}

/** Write the generated project (myst.yml and, if needed, the placeholder root page). */
export function writeProject(projectDir: string, config: ProjectConfig, title: string) {
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'myst.yml'), config.yaml);
  const index = path.join(projectDir, PLACEHOLDER_INDEX);
  if (config.placeholder) fs.writeFileSync(index, `---\ntitle: ${JSON.stringify(title)}\n---\n`);
  else fs.rmSync(index, { force: true });
}
