import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst';

export const collections = {
  docs: defineCollection({ loader: mystLoader({ root: './content' }) }),
};
