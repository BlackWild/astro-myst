/**
 * Navigation built from the entries of a MyST collection (`getCollection()`): the table of
 * contents as a tree, with toc groups, and the previous and next pages. Pure functions, usable in
 * any page or component.
 */

/** What navigation needs from an entry; every entry of a MyST collection has it. */
export interface MystNavEntry {
  id: string;
  data: {
    title: string;
    short_title?: string;
    myst: { url: string; order: number; parents?: { title: string; id?: string }[] };
  };
}

/** A page or a group in the table of contents. */
export interface MystNavItem<E extends MystNavEntry = MystNavEntry> {
  /** The page's `short_title` or `title`, or the group's title. */
  title: string;
  /** The page's entry; `undefined` for a group (or a parent page that is not in `entries`). */
  entry?: E;
  /** The page's URL; `undefined` for a group. */
  url?: string;
  /** 1 for the top level. */
  level: number;
  children: MystNavItem<E>[];
}

const byOrder = <E extends MystNavEntry>(entries: readonly E[]) =>
  [...entries].sort((a, b) => a.data.myst.order - b.data.myst.order);
const key = (parent: { title: string; id?: string }) =>
  parent.id !== undefined ? `page:${parent.id}` : `group:${parent.title}`;

/**
 * The table of contents of a collection as a tree: pages in toc order, nested under their parent
 * pages and under toc groups (entries with a `title` and `children` but no `file`). Entries you
 * filter out (drafts, for example) are left out; their child pages stay, under the parent's title.
 */
export function mystNavigation<E extends MystNavEntry>(entries: readonly E[]): MystNavItem<E>[] {
  const root: MystNavItem<E>[] = [];
  const open: { key: string; item: MystNavItem<E> }[] = []; // the path to the current item
  const add = (depth: number, item: MystNavItem<E>, itemKey: string) => {
    (depth === 0 ? root : open[depth - 1].item.children).push(item);
    open.length = depth;
    open.push({ key: itemKey, item });
  };
  for (const entry of byOrder(entries)) {
    const parents = entry.data.myst.parents ?? [];
    let depth = 0;
    while (depth < open.length && depth < parents.length && open[depth].key === key(parents[depth])) depth++;
    open.length = depth;
    for (; depth < parents.length; depth++) {
      add(depth, { title: parents[depth].title, level: depth + 1, children: [] }, key(parents[depth]));
    }
    const title = entry.data.short_title || entry.data.title;
    add(
      depth,
      { title, entry, url: entry.data.myst.url, level: depth + 1, children: [] },
      key({ title, id: entry.id }),
    );
  }
  return root;
}

/** The pages before and after `current` (an entry or an entry id) in toc order. */
export function mystPrevNext<E extends MystNavEntry>(
  entries: readonly E[],
  current: E | string,
): { prev?: E; next?: E } {
  const sorted = byOrder(entries);
  const id = typeof current === 'string' ? current : current.id;
  const i = sorted.findIndex((entry) => entry.id === id);
  if (i < 0) return {};
  return { prev: sorted[i - 1], next: sorted[i + 1] };
}
