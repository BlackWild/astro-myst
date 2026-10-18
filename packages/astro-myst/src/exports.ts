/**
 * Exports: files that mystmd makes from the pages of a collection (PDF, Word, LaTeX, ...), which
 * astro-myst serves like images and lists in `data.myst.exports` for download links.
 */

/** Export formats astro-myst can ask mystmd for. */
export type MystExportFormat = 'pdf' | 'typst' | 'tex' | 'docx' | 'md' | 'jats';

/** Formats that can combine several pages into one file. */
export type MystCollectionExportFormat = 'pdf' | 'typst' | 'tex';

export interface MystExportsOptions {
  /** One file per page in each of these formats. */
  pages?: MystExportFormat[];
  /** One file with every page of the collection, in toc order, in each of these formats. */
  collection?: MystCollectionExportFormat[];
  /**
   * MyST template by format: a template name (https://github.com/myst-templates, such as
   * `lapreprint-typst`), a URL, or a template folder relative to the Astro root.
   */
  templates?: Partial<Record<MystExportFormat, string>>;
  /** Also export in `astro dev`, on every recompile. Default: `false`, only `astro build` exports. */
  dev?: boolean;
}

/** The `exports` option: formats to export every page in, or the full options. */
export type MystExports = MystExportFormat[] | MystExportsOptions;

/**
 * What each format is in mystmd: its export format, the `myst build` flag that builds it, the
 * extension of the file astro-myst asks for (LaTeX as a zip of the sources and figures; Typst
 * typeset to PDF) and the title of the download.
 */
export const EXPORT_FORMATS: Record<MystExportFormat, { format: string; flag: string; ext: string; title: string }> = {
  pdf: { format: 'pdf', flag: '--pdf', ext: '.pdf', title: 'PDF' },
  typst: { format: 'typst', flag: '--typst', ext: '.pdf', title: 'PDF (Typst)' },
  tex: { format: 'tex', flag: '--tex', ext: '.zip', title: 'LaTeX' },
  docx: { format: 'docx', flag: '--docx', ext: '.docx', title: 'Word' },
  md: { format: 'md', flag: '--md', ext: '.md', title: 'Markdown' },
  jats: { format: 'xml', flag: '--jats', ext: '.xml', title: 'JATS XML' },
};

const COLLECTION_FORMATS: string[] = ['pdf', 'typst', 'tex'];

/** Exports resolved for one collection, or `undefined` when nothing is exported. */
export interface ResolvedExports {
  pages: MystExportFormat[];
  collection: MystCollectionExportFormat[];
  templates: Partial<Record<MystExportFormat, string>>;
}

const normalize = (value: MystExports | undefined): MystExportsOptions =>
  Array.isArray(value) ? { pages: value } : (value ?? {});

/** Merge the integration's and the loader's `exports` options and decide whether to export now. */
export function resolveExports(
  global: MystExports | undefined,
  local: MystExports | undefined,
  dev: boolean,
): ResolvedExports | undefined {
  const merged = { ...normalize(global), ...normalize(local) };
  const known = (f: string): f is MystExportFormat => f in EXPORT_FORMATS;
  for (const f of [...(merged.pages ?? []), ...(merged.collection ?? [])]) {
    if (!known(f))
      throw new Error(`[astro-myst] Unknown export format "${f}": use ${Object.keys(EXPORT_FORMATS).join(', ')}.`);
  }
  for (const f of merged.collection ?? []) {
    if (!COLLECTION_FORMATS.includes(f)) {
      throw new Error(`[astro-myst] Export format "${f}" cannot combine pages: use ${COLLECTION_FORMATS.join(', ')}.`);
    }
  }
  const pages = [...new Set(merged.pages ?? [])];
  const collection = [...new Set(merged.collection ?? [])];
  if (!pages.length && !collection.length) return undefined;
  if (dev && !merged.dev) return undefined;
  return { pages, collection, templates: merged.templates ?? {} };
}

/** `myst build` flags for the exports. */
export function exportFlags(exports: ResolvedExports | undefined): string[] {
  if (!exports) return [];
  return [...new Set([...exports.pages, ...exports.collection].map((f) => EXPORT_FORMATS[f].flag))];
}

/** Formats whose flag `myst build` gets, as mystmd format names (`jats` is `xml`). */
export function exportedMystFormats(exports: ResolvedExports | undefined): Set<string> {
  const formats = new Set<string>();
  for (const f of [...(exports?.pages ?? []), ...(exports?.collection ?? [])]) formats.add(EXPORT_FORMATS[f].format);
  // `--pdf` also builds exports declared as "pdf+tex".
  if (formats.has('pdf')) formats.add('pdf+tex');
  return formats;
}
