// Kept light: astro.config imports this module, so the compiler and renderer load on demand.
import type { RenderOptions, RenderResult } from './render.js';
import type { MystPageJson } from './types.js';

export { default, type MystOptions, type MystProjectOptions } from './integration.js';
export { type MystLoaderOptions, mystLoader } from './loader.js';
export type { MystTocEntry } from './project.js';
export type {
  MarkdownHeading,
  MystNodeHandler,
  MystRenderContext,
  MystRenderSettings,
  RenderOptions,
  RenderResult,
} from './render.js';
export { type MystEntryData, mystSchema } from './schema.js';
export type { HastChild, MystCitation, MystNode, MystPageJson, RawNode } from './types.js';
export type { MystRoute } from './urls.js';

/** Render one page of a `myst build --site` output to HTML (what the loader does for every entry). */
export async function renderMystPage(page: MystPageJson, options: RenderOptions): Promise<RenderResult> {
  const render = await import('./render.js');
  return render.renderMystPage(page, options);
}
