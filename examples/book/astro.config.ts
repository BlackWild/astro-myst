import { defineConfig } from 'astro/config';

// Astro renders the pages; MyST content is compiled by mystmd inside the
// `astro-myst` content loader (see src/content.config.ts).
export default defineConfig({
  site: 'https://example.org',
});
