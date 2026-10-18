import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { createProjectConfig, entryIdFromPath, findSources, readFrontmatter } from '../src/project.js';

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
