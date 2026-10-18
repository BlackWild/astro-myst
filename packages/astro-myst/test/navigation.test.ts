import { describe, expect, it } from 'vitest';
import { type MystNavEntry, type MystNavItem, mystNavigation, mystPrevNext } from '../src/navigation.js';

const entry = (
  id: string,
  order: number,
  parents: { title: string; id?: string }[] = [],
  title = id,
): MystNavEntry => ({
  id,
  data: { title, myst: { url: `/${id}`, order, parents } },
});
const outline = (items: MystNavItem[]): unknown[] =>
  items.map((i) => (i.children.length ? [i.title, i.level, outline(i.children)] : [i.title, i.level]));

const guides = { title: 'Guides' };
const entries = [
  entry('guides/b', 3, [guides]),
  entry('index', 0, [], 'Home'),
  entry('intro', 1),
  entry('guides/a', 2, [guides]),
  entry('guides/a/sub', 4, [guides, { title: 'B', id: 'guides/b' }]),
  entry('appendix', 5),
];

describe('mystNavigation', () => {
  it('builds the toc tree with groups and parent pages, in toc order', () => {
    expect(outline(mystNavigation(entries))).toEqual([
      ['Home', 1],
      ['intro', 1],
      [
        'Guides',
        1,
        [
          ['guides/a', 2],
          ['guides/b', 2, [['guides/a/sub', 3]]],
        ],
      ],
      ['appendix', 1],
    ]);
    const [home, , group] = mystNavigation(entries);
    expect(home).toMatchObject({ url: '/index', entry: { id: 'index' } });
    expect(group.entry).toBeUndefined();
    expect(group.url).toBeUndefined();
  });

  it('keeps children of filtered-out parent pages under the parent title', () => {
    const tree = mystNavigation(entries.filter((e) => e.id !== 'guides/b'));
    expect(outline(tree)[2]).toEqual([
      'Guides',
      1,
      [
        ['guides/a', 2],
        ['B', 2, [['guides/a/sub', 3]]],
      ],
    ]);
  });

  it('prefers the short title', () => {
    const e = entry('x', 0);
    e.data.short_title = 'Short';
    expect(mystNavigation([e])[0].title).toBe('Short');
  });
});

describe('mystPrevNext', () => {
  it('finds the neighbours in toc order', () => {
    expect(mystPrevNext(entries, 'intro')).toMatchObject({ prev: { id: 'index' }, next: { id: 'guides/a' } });
    expect(mystPrevNext(entries, entries[1]).prev).toBeUndefined();
    expect(mystPrevNext(entries, 'appendix').next).toBeUndefined();
    expect(mystPrevNext(entries, 'missing')).toEqual({});
  });
});
