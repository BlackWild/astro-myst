import type { ElementContent } from 'hast';

export interface MystLogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

/** A node of the MyST AST (mdast extended by myst-spec). */
export interface MystNode {
  type: string;
  children?: MystNode[];
  value?: string;
  [key: string]: any;
}

export interface MystCitation {
  label: string;
  html: string;
  enumerator?: string;
  doi?: string;
  url?: string;
}

/** One page as written by `myst build --site` to `_build/site/content/<slug>.json`. */
export interface MystPageJson {
  version?: number;
  kind: string;
  slug: string;
  location: string;
  sha256?: string;
  frontmatter: Record<string, any>;
  mdast: MystNode;
  references?: { cite?: { order: string[]; data: Record<string, MystCitation> } };
  dependencies?: unknown[];
}

export interface MystBuild {
  /** `_build/site/config.json`: projects, page order, levels, title numbering. */
  config: any;
  /**
   * Pages from `_build/site/content`, keyed by page slug (`"theory"`), or by
   * `"<projectSlug>/<slug>"` for multi-project sites.
   */
  pages: Map<string, MystPageJson>;
  /** Folder of each project of a multi-project site (`site.projects[].path` in myst.yml), by project slug. */
  projectPaths: Record<string, string>;
  /** `site.options` from myst.yml (e.g. `numbered_references`, `folders`). */
  siteOptions: Record<string, unknown>;
  /** Folder with images and downloads referenced from the AST (URLs like `/name-<hash>.png`). */
  publicDir: string;
  /** Cross-reference inventory (`myst.xref.json`), when written. */
  xref?: any;
}

/** A raw HTML string embedded in the output (e.g. KaTeX markup produced by mystmd). */
export interface RawNode {
  type: 'raw';
  value: string;
}

export type HastChild = ElementContent | RawNode;
