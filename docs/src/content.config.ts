import { defineCollection } from 'astro:content';
import { mystLoader } from 'astro-myst/loaders';

/** A titled group of pages in the table of contents, in reading order. */
const section = (title: string, folder: string, pages: string[]) => ({
  title,
  children: pages.map((page) => ({ file: `${folder}/${page}.md` })),
});

// The documentation is written in MyST and rendered with astro-myst itself.
const docs = defineCollection({
  loader: mystLoader({
    base: './content',
    route: '/',
    toc: [
      { file: 'index.md' },
      { file: 'getting-started.md' },
      section('Guides', 'guides', [
        'writing-content',
        'routing-and-navigation',
        'styling',
        'latex',
        'citations',
        'notebooks',
        'custom-renderers',
        'multiple-projects',
        'deployment',
      ]),
      section('Reference', 'reference', ['loader-options', 'entry-data', 'components-and-styles', 'api']),
      section('Explanation', 'explanation', ['how-it-works', 'comparison', 'limitations']),
      section('Project', 'project', ['troubleshooting', 'changelog', 'contributing']),
    ],
    project: {
      abbreviations: { AST: 'abstract syntax tree', SSG: 'static site generator' },
    },
    // Pages {include} these files from outside the content folder.
    extraInputs: ['../packages/astro-myst/CHANGELOG.md', '../CONTRIBUTING.md'],
  }),
});

export const collections = { docs };
