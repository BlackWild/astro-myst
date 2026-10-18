import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

// A LaTeX article (index.tex, served at the site root) plus a Markdown supplement, compiled
// together by mystmd so that \ref and citations work across both files.
export const collections = {
  paper: defineCollection({
    loader: mystLoader({
      base: './content',
      route: '/',
      toc: [{ file: 'index.tex' }, { file: 'supplement.md' }],
      project: { numbering: { headings: true } },
      // A JATS XML download of each page, made by mystmd during `astro build`. Add 'pdf' with a
      // TeX distribution installed, or 'docx' (mystmd downloads its template).
      exports: ['jats'],
    }),
  }),
};
