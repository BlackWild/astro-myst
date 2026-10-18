import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

// Every page in ./content becomes an entry of the `book` collection. mystmd compiles them together
// (numbering, cross-references, citations from references.bib, math); no myst.yml needed.
const book = defineCollection({
  loader: mystLoader({
    base: './content',
    route: '/',
    toc: [
      { file: 'index.md' },
      { file: 'theory.md', children: [{ file: 'oscillator.md' }] },
      { file: 'results.md' },
      { file: 'derivation.tex' },
      { file: 'notebook.ipynb' },
      { file: 'appendix.md' },
    ],
    project: {
      title: 'Astro + MyST demo',
      authors: [{ name: 'Siavash Davani', affiliations: ['University of Jena'] }],
      numbering: {
        title: true,
        headings: true,
        figure: { continue: true },
        table: { continue: true },
        equation: { continue: true },
      },
      math: { '\\dd': '\\mathrm{d}' },
      abbreviations: { TLS: 'two-level system' },
    },
  }),
});

export const collections = { book };
