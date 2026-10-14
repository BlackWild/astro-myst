// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Astro renders the pages; MyST content is compiled by mystmd inside the
  // `astro-myst` content loader (see src/content.config.ts).
  site: 'https://example.org',
});
