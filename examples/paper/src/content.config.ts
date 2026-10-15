import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst';

// A LaTeX article (paper.tex) plus a Markdown supplement, compiled together by mystmd so
// that \ref and citations work across both files.
export const collections = {
  paper: defineCollection({ loader: mystLoader({ root: './content' }) }),
};
