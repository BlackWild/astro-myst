/**
 * The astro-myst integration: shares options with the MyST loaders, adds the stylesheets to every
 * page, serves MyST assets from Astro's cache folder in dev and copies them into the build output.
 *
 * ```ts
 * // astro.config.ts
 * import myst from 'astro-myst';
 * export default defineConfig({ integrations: [myst()] });
 * ```
 */
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { ASSETS_DIR, assetsMiddleware, copyAssets } from './assets.js';
import type { MystRenderSettings } from './render.js';
import { getState, initState } from './state.js';

/**
 * Options of a MyST project: anything the `project:` section of a myst.yml accepts, such as
 * `numbering`, `math`, `abbreviations`, `bibliography`, `references` or `plugins`. File paths
 * are relative to the Astro project root. See https://mystmd.org/guide/frontmatter.
 */
export type MystProjectOptions = Record<string, unknown>;

export interface MystOptions extends MystRenderSettings {
  /** MyST project options shared by every MyST collection (each loader can add its own). */
  project?: MystProjectOptions;
  /**
   * Stylesheets added to every page:
   * - `'base'` (default): KaTeX's styles for math and the few rules MyST content needs to work
   *   (tabs, equation numbers, code highlighting colours, ...). They have zero specificity,
   *   so your own CSS, Tailwind utilities and `prose` always win.
   * - `'theme'`: `'base'` plus a small optional theme for admonitions, figures, code and more.
   * - `false`: nothing; import `astro-myst/katex.css`, `/base.css` or `/theme.css` yourself.
   */
  styles?: 'base' | 'theme' | false;
  /** Executable to run instead of the `mystmd` npm package, e.g. `"myst"` from pip or `"jupyter-book"`. */
  command?: string;
  /** Extra `myst build` flags for every collection, e.g. `["--execute"]`. */
  args?: string[];
}

const STYLESHEETS = { base: ['katex', 'base'], theme: ['katex', 'base', 'theme'] } as const;

export default function myst(options: MystOptions = {}): AstroIntegration {
  const styles = options.styles ?? 'base';
  if (styles !== false && !(styles in STYLESHEETS)) {
    throw new Error(`[astro-myst] Unknown \`styles\` option "${styles}": use "base", "theme" or false.`);
  }
  let base = '/';
  const published = new Set<string>();
  const publish = (dir: URL, logger: { info(msg: string): void }) => {
    const outDir = fileURLToPath(dir);
    if (published.has(outDir)) return;
    published.add(outDir);
    const count = copyAssets(outDir, getState()?.assets ?? new Map());
    if (count) logger.info(`Copied ${count} MyST assets to ${ASSETS_DIR}/`);
  };
  return {
    name: 'astro-myst',
    hooks: {
      'astro:config:setup': ({ config, injectScript }) => {
        initState(options);
        base = config.base;
        published.clear();
        if (styles) {
          injectScript('page-ssr', STYLESHEETS[styles].map((s) => `import 'astro-myst/${s}.css';`).join('\n'));
        }
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(assetsMiddleware(base, (collection) => getState()?.assets.get(collection)));
      },
      // Copy assets once the pages exist, before adapters package the output in astro:build:done.
      'astro:build:generated': ({ dir, logger }) => publish(dir, logger),
      'astro:build:done': ({ dir, logger }) => publish(dir, logger),
    },
  };
}
