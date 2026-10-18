import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

export const collections = {
  // Every Markdown file in ./content becomes an entry, served at the site root.
  docs: defineCollection({ loader: mystLoader({ base: './content', route: '/' }) }),
};
