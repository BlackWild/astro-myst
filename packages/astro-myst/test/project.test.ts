import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
  createProjectConfig,
  entryIdFromPath,
  findSources,
  readFrontmatter,
  SOURCE_LINK,
  sourceFileOf,
  writeProject,
} from '../src/project.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-project-'));
const touch = (file: string, text = '') => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

describe('entryIdFromPath', () => {
  it("gives the same ids as Astro's glob() loader", async () => {
    // Astro does not export this helper; load it by path to compare against the real thing.
    const require = createRequire(import.meta.url);
    const utils = path.join(path.dirname(require.resolve('astro/package.json')), 'dist/content/utils.js');
    const { getContentEntryIdAndSlug } = await import(pathToFileURL(utils).href);
    const base = pathToFileURL(`${tmp()}/`);
    for (const entry of [
      'index.md',
      'posts/Hello World.md',
      'posts/2024/index.md',
      'a/b.c.md',
      'Ünïcode Post.md',
      'notes/my_note.ipynb',
      'Chapter 1/Intro (draft).md',
    ]) {
      const { slug } = getContentEntryIdAndSlug({
        entry: new URL(encodeURI(entry), base),
        contentDir: base,
        collection: '',
      });
      expect(entryIdFromPath(entry), entry).toBe(slug);
    }
  });

  it('uses the frontmatter slug, like glob()', () => {
    expect(entryIdFromPath('posts/a.md', { slug: 'custom/path' })).toBe('custom/path');
    expect(entryIdFromPath('posts/a.md', { slug: 2024 })).toBe('2024');
    expect(entryIdFromPath('posts/a.md', { slug: '' })).toBe('posts/a');
  });
});

describe('readFrontmatter', () => {
  it('parses YAML like Astro: dates become Dates, every key is kept', () => {
    const { data, body } = readFrontmatter('---\ntitle: Post\npubDate: 2024-05-01\ndraft: false\n---\n\n# Hi\n');
    expect(data).toEqual({ title: 'Post', pubDate: new Date('2024-05-01'), draft: false });
    expect(body).toBe('\n# Hi\n');
  });

  it('handles missing, empty and invalid frontmatter', () => {
    expect(readFrontmatter('# No frontmatter')).toEqual({ data: {}, body: '# No frontmatter' });
    expect(readFrontmatter('---\n---\nText')).toEqual({ data: {}, body: 'Text' });
    expect(readFrontmatter('---\n: [oops\n---\nText').data).toEqual({});
    expect(readFrontmatter('---\r\ntitle: CRLF\r\n---\r\nText')).toEqual({ data: { title: 'CRLF' }, body: 'Text' });
  });
});

describe('findSources', () => {
  it('finds Markdown and notebooks, skipping `_` files and generated folders', async () => {
    const dir = tmp();
    for (const f of [
      'index.md',
      'b/post.md',
      'b/nb.ipynb',
      '_snippet.md',
      'b/_part.md',
      'node_modules/x.md',
      '_build/y.md',
      'c.tex',
    ]) {
      touch(path.join(dir, f));
    }
    expect(await findSources(dir, '**/[^_]*.{md,ipynb}')).toEqual(['b/nb.ipynb', 'b/post.md', 'index.md']);
    expect(await findSources(dir, ['**/*.tex', 'index.md'])).toEqual(['c.tex', 'index.md']);
  });
});

describe('createProjectConfig', () => {
  const setup = () => {
    const root = tmp();
    const baseDir = path.join(root, 'src', 'content', 'blog');
    const projectDir = path.join(root, 'node_modules', '.astro', 'astro-myst', 'blog');
    return {
      root,
      baseDir,
      projectDir,
      spec: { collection: 'blog', astroRoot: root, baseDir, projectDir, project: {} },
    };
  };
  const toc = (yaml: string) => parseYaml(yaml).project.toc;

  it('lists the files where they are, with a placeholder root page when there is no index', async () => {
    const { spec } = setup();
    const config = await createProjectConfig({ ...spec, sources: ['a.md', 'b/c.md'] });
    expect(config.placeholder).toBe(true);
    expect(toc(config.yaml)).toEqual([
      { file: 'index.md' },
      { file: '../../../../src/content/blog/a.md' },
      { file: '../../../../src/content/blog/b/c.md' },
    ]);
    expect(parseYaml(config.yaml)).toMatchObject({ version: 1, project: { id: 'astro-myst-blog' }, site: {} });
  });

  it("uses the collection's own index as the root page", async () => {
    const { spec } = setup();
    const config = await createProjectConfig({ ...spec, sources: ['a.md', 'index.md'] });
    expect(config.placeholder).toBe(false);
    expect(toc(config.yaml).map((e: any) => path.basename(e.file))).toEqual(['index.md', 'a.md']);
  });

  it('maps a toc with children, titles and patterns, and appends unlisted files', async () => {
    const { spec, baseDir } = setup();
    for (const f of ['intro.md', 'guide/one.md', 'guide/two.md', 'extra.md']) touch(path.join(baseDir, f));
    const config = await createProjectConfig({
      ...spec,
      sources: ['extra.md', 'guide/one.md', 'guide/two.md', 'intro.md'],
      toc: [
        { file: './intro.md' },
        { title: 'Guides', children: [{ pattern: 'guide/*.md' }] },
        { url: 'https://x.org', title: 'X' },
      ],
    });
    expect(config.placeholder).toBe(false);
    const rel = (f: string) => `../../../../src/content/blog/${f}`;
    expect(toc(config.yaml)).toEqual([
      { file: rel('intro.md') },
      { title: 'Guides', children: [{ file: rel('guide/one.md') }, { file: rel('guide/two.md') }] },
      { url: 'https://x.org', title: 'X' },
      { file: rel('extra.md') },
    ]);
  });

  it('adds a placeholder when the toc does not start with a file', async () => {
    const { spec } = setup();
    const config = await createProjectConfig({
      ...spec,
      sources: ['a.md'],
      toc: [{ title: 'Part', children: [{ file: 'a.md' }] }],
    });
    expect(config.placeholder).toBe(true);
    expect(toc(config.yaml)[0]).toEqual({ file: 'index.md' });
  });

  it('rewrites file paths of project options and finds .bib files in the collection', async () => {
    const { spec, baseDir, root } = setup();
    touch(path.join(baseDir, 'refs', 'a.bib'));
    const auto = await createProjectConfig({ ...spec, sources: [] });
    expect(parseYaml(auto.yaml).project.bibliography).toEqual(['../../../../src/content/blog/refs/a.bib']);

    const explicit = await createProjectConfig({
      ...spec,
      sources: [],
      project: {
        bibliography: ['shared/refs.bib', 'https://example.org/refs.bib'],
        plugins: ['plugins/a.mjs', { type: 'executable', path: 'plugins/b.py' }],
        numbering: { headings: true },
      },
    });
    expect(parseYaml(explicit.yaml).project).toMatchObject({
      bibliography: ['../../../../shared/refs.bib', 'https://example.org/refs.bib'],
      plugins: ['../../../../plugins/a.mjs', { type: 'executable', path: '../../../../plugins/b.py' }],
      numbering: { headings: true },
    });
    expect(explicit.inputs).toEqual(
      ['shared/refs.bib', 'plugins/a.mjs', 'plugins/b.py'].map((f) => path.join(root, ...f.split('/'))),
    );
  });
});

describe('notebook execution', () => {
  const setup = () => {
    const root = tmp();
    const baseDir = path.join(root, 'src', 'content', 'nb');
    const projectDir = path.join(root, 'node_modules', '.astro', 'astro-myst', 'nb');
    touch(path.join(baseDir, 'index.md'), '# Home\n');
    touch(path.join(baseDir, 'run', 'analysis.ipynb'), '{}');
    touch(path.join(baseDir, 'md-notebook.md'), '---\nkernelspec:\n  name: python3\n---\n');
    const spec = {
      collection: 'nb',
      astroRoot: root,
      baseDir,
      projectDir,
      project: {},
      sources: ['index.md', 'md-notebook.md', 'run/analysis.ipynb'],
    };
    return { root, baseDir, projectDir, spec };
  };
  const files = (yaml: string) => parseYaml(yaml).project.toc.map((e: any) => e.file);

  it('lists executable files through the source link only with --execute', async () => {
    const { spec, baseDir } = setup();
    const plain = await createProjectConfig(spec);
    expect(plain.link).toBeUndefined();
    expect(files(plain.yaml).every((f: string) => f.startsWith('../'))).toBe(true);

    // All files go through the link, so that relative links between pages keep working.
    const executed = await createProjectConfig({ ...spec, execute: true });
    expect(executed.link).toBe(baseDir);
    expect(files(executed.yaml)).toEqual([
      `${SOURCE_LINK}/index.md`,
      `${SOURCE_LINK}/md-notebook.md`,
      `${SOURCE_LINK}/run/analysis.ipynb`,
    ]);
    // Nothing to execute: no link.
    const markdown = await createProjectConfig({ ...spec, execute: true, sources: ['index.md'] });
    expect(markdown.link).toBeUndefined();
    expect(files(markdown.yaml)).toEqual(['../../../../src/content/nb/index.md']);
    // A kernelspec in the project options makes Markdown files executable.
    const project = { kernelspec: { name: 'python3' } };
    const kernel = await createProjectConfig({ ...spec, execute: true, sources: ['index.md'], project });
    expect(files(kernel.yaml)).toEqual([`${SOURCE_LINK}/index.md`]);
  });

  it('creates, keeps and removes the link without touching the content', async () => {
    const { spec, baseDir, projectDir } = setup();
    const link = path.join(projectDir, SOURCE_LINK);
    const executed = await createProjectConfig({ ...spec, execute: true });
    writeProject(projectDir, executed, 'nb');
    expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(path.join(link, 'run', 'analysis.ipynb'))).toBe(
      fs.realpathSync(path.join(baseDir, 'run', 'analysis.ipynb')),
    );
    const inode = fs.lstatSync(link).ino;
    writeProject(projectDir, executed, 'nb');
    expect(fs.lstatSync(link).ino).toBe(inode); // kept as it is

    writeProject(projectDir, await createProjectConfig(spec), 'nb');
    expect(fs.existsSync(link)).toBe(false);
    expect(fs.readdirSync(baseDir).sort()).toEqual(['index.md', 'md-notebook.md', 'run']);
  });

  it('maps page locations back to the source files', () => {
    const { baseDir, projectDir } = setup();
    expect(sourceFileOf(`/${SOURCE_LINK}/run/analysis.ipynb`, projectDir, baseDir)).toBe(
      path.join(baseDir, 'run', 'analysis.ipynb'),
    );
    expect(sourceFileOf('/../../../../src/content/nb/index.md', projectDir, baseDir)).toBe(
      path.join(baseDir, 'index.md'),
    );
    expect(sourceFileOf('/index.md', projectDir, baseDir)).toBeUndefined(); // the placeholder
  });
});

describe('exports', () => {
  it('declares project exports with outputs in the generated project', async () => {
    const root = tmp();
    const baseDir = path.join(root, 'src', 'content', 'book');
    const projectDir = path.join(root, 'node_modules', '.astro', 'astro-myst', 'book');
    touch(path.join(root, 'templates', 'mine', 'template.yml'));
    const config = await createProjectConfig({
      collection: 'book',
      astroRoot: root,
      baseDir,
      projectDir,
      project: {},
      sources: ['index.md', 'ch/one.md'],
      exports: {
        pages: ['md'],
        collection: ['pdf', 'typst'],
        templates: { pdf: 'templates/mine', typst: 'lapreprint-typst' },
      },
    });
    const rel = (f: string) => `../../../../src/content/book/${f}`;
    expect(parseYaml(config.yaml).project.exports).toEqual([
      {
        id: 'astro-myst-md-0',
        format: 'md',
        articles: [rel('index.md')],
        output: '_build/exports/astro-myst/md/index.md',
      },
      {
        id: 'astro-myst-md-1',
        format: 'md',
        articles: [rel('ch/one.md')],
        output: '_build/exports/astro-myst/md/ch/one.md',
      },
      {
        id: 'astro-myst-pdf-collection',
        format: 'pdf',
        template: '../../../../templates/mine',
        articles: [rel('index.md'), rel('ch/one.md')],
        output: '_build/exports/astro-myst/pdf/book.pdf',
      },
      {
        id: 'astro-myst-typst-collection',
        format: 'typst',
        template: 'lapreprint-typst',
        articles: [rel('index.md'), rel('ch/one.md')],
        output: '_build/exports/astro-myst/typst/book.pdf',
      },
    ]);
    expect(config.exports).toEqual([
      {
        format: 'md',
        scope: 'page',
        source: path.join(baseDir, 'index.md'),
        output: path.join(projectDir, '_build/exports/astro-myst/md/index.md'),
      },
      {
        format: 'md',
        scope: 'page',
        source: path.join(baseDir, 'ch', 'one.md'),
        output: path.join(projectDir, '_build/exports/astro-myst/md/ch/one.md'),
      },
      { format: 'pdf', scope: 'collection', output: path.join(projectDir, '_build/exports/astro-myst/pdf/book.pdf') },
      {
        format: 'typst',
        scope: 'collection',
        output: path.join(projectDir, '_build/exports/astro-myst/typst/book.pdf'),
      },
    ]);
    expect(config.inputs).toContain(path.join(root, 'templates', 'mine')); // watched and part of the cache key
  });
});
