import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

// Deployed to GitHub Pages at https://blackwild.github.io/astro-myst/.
// Override with DOCS_SITE / DOCS_BASE, e.g. for a custom domain (DOCS_BASE=/).
export default defineConfig({
  site: process.env.DOCS_SITE ?? 'https://blackwild.github.io',
  base: process.env.DOCS_BASE ?? '/astro-myst',
  trailingSlash: 'ignore',
  integrations: [myst({ styles: 'theme', scripts: { copyCode: true, mermaid: true } })],
  // Mermaid's own chunks are large; they load only on pages with a diagram.
  vite: { build: { chunkSizeWarningLimit: 1500 } },
});
