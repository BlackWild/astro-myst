import { defineConfig } from 'astro/config';
import myst from 'astro-myst';

// MyST content is compiled by mystmd inside the `astro-myst` content loader (see
// src/content.config.ts); the integration serves its images and adds the stylesheets.
export default defineConfig({
  site: 'https://example.org',
  integrations: [myst({ styles: 'theme' })],
});
