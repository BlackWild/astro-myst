import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileMystProject } from '../src/compile.js';
import type { MystNode } from '../src/types.js';
import { copyFixture, memoryLogger, PACKAGE_ROOT } from './helpers.js';

function find(node: MystNode, pred: (n: MystNode) => boolean): MystNode[] {
  const out: MystNode[] = pred(node) ? [node] : [];
  for (const c of node.children ?? []) out.push(...find(c, pred));
  return out;
}

describe('compileMystProject (runs the real mystmd)', () => {
  it('produces fully resolved pages with numbering and cross-page references', async () => {
    const root = copyFixture('basic');
    const { logger, messages } = memoryLogger();
    const build = await compileMystProject({ root, resolveFrom: PACKAGE_ROOT, logger });

    expect([...build.pages.keys()].sort()).toEqual(['chapter', 'index']);
    expect(build.config.projects[0].index).toBe('index');

    const index = build.pages.get('index')!;
    const chapter = build.pages.get('chapter')!;
    const [fig] = find(index.mdast, (n) => n.type === 'container' && n.identifier === 'fig-dot');
    expect(fig.enumerator).toBe('1');
    const [eq] = find(chapter.mdast, (n) => n.type === 'math' && n.identifier === 'eq-euler');
    expect(eq.enumerator).toBe('1');
    expect(eq.html).toContain('katex');

    // @eq-euler on the index page resolves to the chapter page
    const [xref] = find(index.mdast, (n) => n.type === 'crossReference' && n.identifier === 'eq-euler');
    expect(xref).toMatchObject({ resolved: true, remote: true, url: '/chapter' });
    // and @sec-intro on the chapter page points back to the index ("/")
    const [back] = find(chapter.mdast, (n) => n.type === 'crossReference' && n.identifier === 'sec-intro');
    expect(back).toMatchObject({ resolved: true, remote: true, url: '/' });

    expect(index.references?.cite?.order).toEqual(['knuth1984']);
    expect(fs.readdirSync(build.publicDir).some((f) => f.startsWith('dot-') && f.endsWith('.svg'))).toBe(true);
    expect(messages.some((m) => m.level === 'warn' && m.msg.includes('does-not-exist'))).toBe(true);

    // The temporary stub template is removed again
    expect(fs.existsSync(path.join(root, '_build', 'templates', 'site', 'myst', 'book-theme'))).toBe(false);
  });

  it('fails with a helpful message without myst.yml', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-myst-empty-'));
    await expect(compileMystProject({ root: empty, logger: memoryLogger().logger })).rejects.toThrow(/No myst\.yml/);
  });

  it('explains a missing site section in myst.yml', async () => {
    const root = copyFixture('basic');
    const yml = path.join(root, 'myst.yml');
    fs.writeFileSync(yml, fs.readFileSync(yml, 'utf8').replace('site: {}\n', ''));
    await expect(compileMystProject({ root, resolveFrom: PACKAGE_ROOT, logger: memoryLogger().logger })).rejects.toThrow(
      /has no `site:` section/,
    );
  });

  it('reports a missing executable clearly', async () => {
    const root = copyFixture('basic');
    await expect(
      compileMystProject({ root, command: 'definitely-not-a-myst-binary', logger: memoryLogger().logger }),
    ).rejects.toThrow(/Could not run "definitely-not-a-myst-binary"/);
  });
});
