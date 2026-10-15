import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst';

// The documentation is written in MyST and rendered with astro-myst itself.
const docs = defineCollection({
  loader: mystLoader({
    root: './content',
    // Pages {include} these files from outside the MyST project.
    extraInputs: ['../packages/astro-myst/CHANGELOG.md', '../CONTRIBUTING.md'],
  }),
});

export const collections = { docs };
