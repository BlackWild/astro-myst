import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst';

// Every page of the MyST project in ./content becomes an entry of the `book`
// collection. mystmd does the compiling (numbering, cross-references, citations,
// math); the loader stores the rendered HTML so `render(entry)` just works.
const book = defineCollection({
  loader: mystLoader({ root: './content' }),
});

export const collections = { book };
