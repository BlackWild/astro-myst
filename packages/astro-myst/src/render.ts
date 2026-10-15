/**
 * Renders a fully-resolved MyST AST (as produced by `myst build --site`) to HTML.
 *
 * mystmd has already done the hard work: every figure/table/equation/section has
 * its `enumerator`, every cross-reference is `resolved` (with a `url` when the
 * target lives on another page), citations carry formatted text, and math nodes
 * carry pre-rendered KaTeX `html`. This module maps nodes to HTML elements and
 * rewrites MyST URLs into Astro URLs.
 */
import type { Element } from 'hast';
import { toHtml } from 'hast-util-to-html';
import { h } from 'hastscript';
import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki';
import type { HastChild, MystNode, MystPageJson, RawNode } from './types.js';

export interface MarkdownHeading {
  depth: number;
  slug: string;
  text: string;
}

export interface MystRenderContext {
  /** The page being rendered (frontmatter, references, ...). */
  page: MystPageJson;
  /** Render all children of `node` (custom handlers apply). */
  all(node: MystNode): HastChild[];
  /** Render `node` (custom handlers apply). */
  one(node: MystNode, parent?: MystNode): HastChild[];
  /** Render `node` with the built-in renderer, bypassing custom handlers (useful for wrapping). */
  renderDefault(node: MystNode, parent?: MystNode): HastChild[];
  /** Map a MyST page URL ("/", "/theory") to the Astro URL, or `undefined` if unknown. */
  resolvePageUrl(mystUrl: string): string | undefined;
  /** Map a MyST asset URL ("/figure-<hash>.png") to its public URL. */
  resolveAssetUrl(url: string): string;
  /** Build an element (hastscript's `h()`, accepting rendered children including raw HTML). */
  h: (tag: string, props?: Record<string, unknown> | null, children?: HastChild | HastChild[] | string) => Element;
  /** Embed a raw HTML string. */
  raw(html: string): RawNode;
  /** Create a text node. */
  text(value: string): HastChild;
}

/**
 * Custom renderer for one MyST node type. Return hast nodes to replace the
 * built-in output, `null` to render nothing, or `undefined` to fall back to
 * the built-in renderer.
 */
export type MystNodeHandler = (
  node: MystNode,
  ctx: MystRenderContext,
  parent?: MystNode,
) => HastChild | HastChild[] | undefined | null;

export interface RenderOptions {
  /** Map a MyST page URL ("/", "/theory") to the URL of the Astro page. */
  resolvePageUrl: (mystUrl: string) => string | undefined;
  /** Map a MyST asset URL ("/figure-<hash>.png") to its public URL. */
  resolveAssetUrl: (url: string) => string;
  /** Shiki themes for code blocks, or `false` to disable syntax highlighting. */
  codeThemes?: { light: string; dark: string } | false;
  /** Per-node-type overrides, e.g. for custom directives from MyST plugins. */
  handlers?: Record<string, MystNodeHandler>;
  /** Numbered citations ("[1]") instead of author–year. The loader defaults this to myst.yml `site.options.numbered_references`. */
  numberedReferences?: boolean;
  /** Heading for the bibliography section. Default: "References". */
  bibliographyTitle?: string;
  /** Heading for the footnotes section. Default: "Footnotes". */
  footnotesTitle?: string;
  /**
   * Read a text asset written by mystmd (large notebook outputs are stored as
   * files, e.g. "/<hash>.html"). Return `undefined` if unavailable.
   */
  readAsset?: (url: string) => string | undefined;
}

export interface RenderResult {
  html: string;
  headings: MarkdownHeading[];
}

const DEFAULT_THEMES = { light: 'github-light', dark: 'github-dark' };
const highlighters = new Map<string, Promise<Highlighter>>();
function getHighlighter(themes: { light: string; dark: string }) {
  const key = `${themes.light}|${themes.dark}`;
  if (!highlighters.has(key)) highlighters.set(key, createHighlighter({ themes: [themes.light, themes.dark], langs: [] }));
  return highlighters.get(key)!;
}

const raw = (value: string): RawNode => ({ type: 'raw', value });
const text = (value: string): HastChild => ({ type: 'text', value });
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const cls = (...names: unknown[]) => names.filter((n) => typeof n === 'string' && n).join(' ') || undefined;
const PART_TITLES: Record<string, string> = {
  abstract: 'Abstract',
  summary: 'Summary',
  keypoints: 'Key points',
  acknowledgments: 'Acknowledgments',
  acknowledgements: 'Acknowledgements',
  data_availability: 'Data availability',
  availability: 'Availability',
};
/**
 * Element id of a bibliography entry. Labels can be BibTeX keys ("knuth1984") or, for
 * citations fetched from doi.org, URLs ("https://doi.org/10.5281/zenodo.6476040").
 */
export const citeId = (label: string) => `cite-${label.replace(/^https?:\/\/(dx\.)?doi\.org\//i, 'doi-').replace(/[^\w.-]+/g, '-')}`;
const LANG_ALIASES: Record<string, string> = { ipython3: 'python', ipython: 'python', python3: 'python', 'c++': 'cpp' };

function toText(node: MystNode): string {
  if (node.type === 'inlineMath' || node.type === 'math') return node.value ?? '';
  if (typeof node.value === 'string' && !node.children) return node.value;
  return (node.children ?? []).map(toText).join('');
}

function hastClasses(el: Element): string[] {
  const list = [el.properties?.class, el.properties?.className]
    .flat()
    .filter(Boolean)
    .flatMap((c) => String(c).split(/\s+/));
  delete el.properties.class;
  el.properties.className = list;
  return list;
}

class MystRenderer {
  readonly headings: MarkdownHeading[] = [];
  readonly ctx: MystRenderContext;
  private footnotes = new Map<string, { enumerator: string; node: MystNode }>();
  private tabSets = 0;
  private highlighter?: Highlighter;
  private langs = new Set<string>();
  private themes: { light: string; dark: string } | false;
  private tight = new WeakSet<MystNode>();

  constructor(
    private page: MystPageJson,
    private opts: RenderOptions,
  ) {
    this.themes = opts.codeThemes === false ? false : (opts.codeThemes ?? DEFAULT_THEMES);
    this.ctx = {
      page,
      all: (node) => this.all(node),
      one: (node, parent) => this.one(node, parent),
      renderDefault: (node, parent) => this.builtin(node, parent),
      resolvePageUrl: opts.resolvePageUrl,
      resolveAssetUrl: opts.resolveAssetUrl,
      h: (tag, props, children) => this.el(tag, props ?? null, children === undefined ? [] : typeof children === 'string' || Array.isArray(children) ? children : [children]),
      raw,
      text,
    };
  }

  private lang(node: MystNode): string | undefined {
    const lang = node.lang ? (LANG_ALIASES[node.lang] ?? node.lang) : undefined;
    return lang && lang in bundledLanguages ? lang : undefined;
  }

  /** Load only the code languages this page needs. */
  async prepare() {
    if (!this.themes) return;
    const needed = new Set<string>();
    const walk = (n: MystNode) => {
      if (n.type === 'code') {
        const lang = this.lang(n);
        if (lang) needed.add(lang);
      }
      n.children?.forEach(walk);
    };
    walk(this.page.mdast);
    if (!needed.size) return;
    this.highlighter = await getHighlighter(this.themes);
    for (const lang of needed) {
      if (!this.highlighter.getLoadedLanguages().includes(lang)) await this.highlighter.loadLanguage(lang as any);
      this.langs.add(lang);
    }
  }

  all(node: MystNode): HastChild[] {
    return (node.children ?? []).flatMap((child) => this.one(child, node));
  }

  one(node: MystNode, parent?: MystNode): HastChild[] {
    // Notebook cell tags (remove-input, hide-output, ...) arrive as `visibility`.
    if (node.visibility === 'remove') return [];
    const out = this.render(node, parent);
    if (node.visibility !== 'hide' || !out.length) return out;
    const what = node.type === 'code' ? 'code' : node.type === 'outputs' || node.type === 'output' ? 'output' : node.type === 'block' ? 'cell' : 'content';
    return [this.el('details', { class: 'myst-hidden' }, [this.el('summary', null, `Show ${what}`), ...out])];
  }

  private render(node: MystNode, parent?: MystNode): HastChild[] {
    const custom = this.opts.handlers?.[node.type];
    if (custom) {
      const out = custom(node, this.ctx, parent);
      if (out !== undefined) return out === null ? [] : Array.isArray(out) ? out : [out];
    }
    return this.builtin(node, parent);
  }

  private href(url: string | undefined, id: string | undefined) {
    const page = url ? this.opts.resolvePageUrl(url) : '';
    return `${page ?? url ?? ''}${id ? `#${id}` : ''}`;
  }

  el(tag: string, props: Record<string, unknown> | null, children: HastChild[] | string = []): Element {
    return h(tag, (props ?? {}) as any, children as any);
  }

  builtin(n: MystNode, parent?: MystNode): HastChild[] {
    const id: string | undefined = n.html_id ?? n.identifier ?? undefined;
    const kids = () => this.all(n);
    switch (n.type) {
      case 'root':
      case 'include':
      case 'embed':
        return kids();
      case 'block': {
        // Document parts: `\begin{abstract}` in LaTeX, `+++ {"part": "abstract"}` in MyST.
        const part = typeof n.data?.part === 'string' ? n.data.part : undefined;
        if (part) {
          const title = PART_TITLES[part.toLowerCase()] ?? cap(part.replace(/[_-]+/g, ' '));
          return [
            this.el('section', { id: n.label ? id : undefined, class: cls('myst-part', `myst-part-${part.toLowerCase()}`, n.class), dataPart: part }, [
              this.el('h2', { class: 'part-title' }, title),
              ...kids(),
            ]),
          ];
        }
        // `+++` blocks and notebook cells; keep a wrapper only when it carries meaning.
        const isCell = typeof n.kind === 'string' && n.kind.startsWith('notebook-code');
        if (!n.class && !n.label && !isCell) return kids();
        return [this.el('div', { id: n.label ? id : undefined, class: cls(isCell && 'notebook-cell', n.class) }, kids())];
      }
      case 'text':
        return [text(n.value ?? '')];
      case 'paragraph':
        if (parent && this.tight.has(parent)) return kids();
        return [this.el('p', null, kids())];
      case 'heading': {
        const numbered = Boolean(n.enumerator) && n.enumerated !== false;
        const label = toText(n);
        this.headings.push({ depth: n.depth, slug: id ?? '', text: numbered ? `${n.enumerator} ${label}` : label });
        return [
          this.el(`h${Math.min(6, Math.max(1, n.depth ?? 2))}`, { id }, [
            ...(numbered ? [this.el('span', { class: 'heading-number' }, n.enumerator), text(' ')] : []),
            ...kids(),
            ...(id ? [this.el('a', { class: 'heading-anchor', href: `#${id}`, ariaLabel: 'Link to this section' }, '#')] : []),
          ]),
        ];
      }
      case 'emphasis':
        return [this.el('em', null, kids())];
      case 'strong':
        return [this.el('strong', null, kids())];
      case 'underline':
        return [this.el('u', null, kids())];
      case 'delete':
        return [this.el('del', null, kids())];
      case 'smallcaps':
        return [this.el('span', { class: 'smallcaps' }, kids())];
      case 'superscript':
        return [this.el('sup', null, kids())];
      case 'subscript':
        return [this.el('sub', null, kids())];
      case 'keyboard':
        return [this.el('kbd', null, kids())];
      case 'abbreviation':
        return [this.el('abbr', { title: n.title }, kids())];
      case 'inlineCode':
        return [this.el('code', null, n.value ?? '')];
      case 'break':
        return [this.el('br', null)];
      case 'thematicBreak':
        return [this.el('hr', null)];
      case 'blockquote':
        return [this.el('blockquote', { class: n.class }, kids())];
      case 'comment':
      case 'mystComment':
      case 'mystTarget':
      case 'target':
        return [];
      case 'html':
        return [raw(n.value ?? '')];
      case 'list': {
        if (n.spread === false) for (const item of n.children ?? []) this.tight.add(item);
        return [this.el(n.ordered ? 'ol' : 'ul', { start: n.ordered && n.start !== 1 ? n.start : undefined, class: n.class }, kids())];
      }
      case 'listItem': {
        const box = typeof n.checked === 'boolean' ? [this.el('input', { type: 'checkbox', checked: n.checked, disabled: true }), text(' ')] : [];
        return [this.el('li', { class: box.length ? 'task-list-item' : undefined }, [...box, ...kids()])];
      }
      case 'definitionList':
        return [this.el('dl', { class: n.class }, kids())];
      case 'definitionTerm':
        return [this.el('dt', { id: n.identifier ? id : undefined }, kids())];
      case 'definitionDescription':
        return [this.el('dd', null, kids())];
      case 'glossary':
        return [this.el('div', { class: 'glossary' }, kids())];

      // ----- links & references ----------------------------------------------
      case 'link': {
        const url = String(n.url ?? '');
        const [base, hash] = url.split('#');
        const page = n.internal || n.dataUrl ? this.opts.resolvePageUrl(base) : undefined;
        let href = url;
        if (page !== undefined) href = `${page}${hash !== undefined ? `#${hash}` : ''}`;
        else if (n.static) href = this.opts.resolveAssetUrl(url); // file copied by mystmd, e.g. a PDF download
        const external = /^https?:\/\//.test(href);
        return [this.el('a', { href, title: n.title, class: n.class, ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }, kids())];
      }
      case 'crossReference': {
        if (!n.resolved) {
          const content = n.children?.length ? kids() : [text(n.identifier ?? n.label ?? '?')];
          return [this.el('span', { class: 'xref xref-unresolved', title: `Unresolved reference: ${n.identifier ?? n.label}` }, content)];
        }
        const target = n.html_id ?? n.identifier;
        // References into *other* MyST sites (myst.yml `references:`) carry that site's base URL.
        const href = n.remoteBaseUrl
          ? `${String(n.remoteBaseUrl).replace(/\/$/, '')}${n.url ?? ''}${target ? `#${target}` : ''}`
          : this.href(n.remote ? n.url : undefined, target);
        return [
          this.el(
            'a',
            {
              class: 'xref',
              href,
              dataXrefKind: n.kind,
              dataXrefRemote: n.remote ? 'true' : undefined,
              dataXrefExternal: n.remoteBaseUrl ? 'true' : undefined,
            },
            kids(),
          ),
        ];
      }
      case 'citeGroup': {
        const numbered = this.opts.numberedReferences && n.kind === 'parenthetical';
        const sep = numbered || n.kind === 'narrative' ? ', ' : '; ';
        const inner = (n.children ?? []).flatMap((c, i) => [...(i ? [text(sep)] : []), ...this.one(c, n)]);
        const [open, close] = numbered ? ['[', ']'] : ['(', ')'];
        return [this.el('span', { class: 'cite-group' }, n.kind === 'parenthetical' ? [text(open), ...inner, text(close)] : inner)];
      }
      case 'cite': {
        const label: string = n.label ?? n.identifier;
        let content = n.children?.length ? kids() : [text(label)];
        if (n.error) return [this.el('span', { class: 'cite cite-error', title: `Citation not found: ${label}` }, content)];
        const inGroup = parent?.type === 'citeGroup';
        const num = this.opts.numberedReferences ? (n.enumerator ?? this.page.references?.cite?.data[label]?.enumerator) : undefined;
        if (num) {
          // Numbered style: "[3]" in parentheses, "Knuth [3]" in running text.
          const narrative = n.kind === 'narrative' || parent?.kind === 'narrative';
          const authors = toText(n).replace(/\s*\(\d{4}[a-z]?\)\s*$/, '');
          content = narrative ? [text(`${authors} [${num}]`)] : [text(inGroup ? String(num) : `[${num}]`)];
        } else if (!inGroup && n.kind === 'parenthetical') {
          content = [text('('), ...content, text(')')];
        }
        return [this.el('a', { class: 'cite', href: `#${citeId(label)}`, dataCite: label }, content)];
      }
      case 'footnoteReference': {
        const key: string = n.identifier ?? n.label;
        const num = String(n.enumerator ?? key);
        return [this.el('sup', { class: 'footnote-ref' }, [this.el('a', { href: `#fn-${key}`, id: `fnref-${key}`, ariaLabel: `Footnote ${num}` }, num)])];
      }
      case 'footnoteDefinition': {
        const key: string = n.identifier ?? n.label;
        this.footnotes.set(key, { enumerator: String(n.enumerator ?? key), node: n });
        return [];
      }

      // ----- math ------------------------------------------------------------
      case 'inlineMath':
        return [this.el('span', { class: 'math-inline' }, n.html ? [raw(n.html)] : [this.el('code', null, n.value ?? '')])];
      case 'math': {
        const numbered = Boolean(n.enumerator) && n.enumerated !== false;
        return [
          this.el('div', { class: 'math-display', id: n.label || n.identifier ? id : undefined }, [
            this.el('div', { class: 'math-body' }, n.html ? [raw(n.html)] : [this.el('pre', null, [this.el('code', null, n.value ?? '')])]),
            ...(numbered ? [this.el('span', { class: 'equation-number' }, `(${n.enumerator})`)] : []),
          ]),
        ];
      }

      // ----- figures, tables, code -------------------------------------------
      case 'container':
        return [
          this.el(
            'figure',
            {
              id,
              class: cls('myst-container', `myst-${n.kind ?? 'figure'}`, n.subcontainer && 'subfigure', n.enumerated !== false && 'numbered', n.class),
              dataKind: n.kind,
            },
            kids(),
          ),
        ];
      case 'caption':
        return [this.el('figcaption', null, kids())];
      case 'captionNumber':
        return [this.el('span', { class: 'caption-number' }, kids()), text(' ')];
      case 'legend':
        return [this.el('div', { class: 'legend' }, kids())];
      case 'image': {
        const w = n.width ? String(n.width) : undefined;
        const width = w ? (/^\d+(\.\d+)?$/.test(w) ? `${w}px` : w) : undefined;
        return [
          this.el('img', {
            src: this.opts.resolveAssetUrl(n.urlOptimized ?? n.url),
            alt: n.alt ?? '',
            title: n.title,
            loading: 'lazy',
            decoding: 'async',
            class: cls(n.align && `align-${n.align}`, n.class),
            style: width ? `width: ${width}` : undefined,
            height: n.height,
          }),
        ];
      }
      case 'iframe':
        return [
          this.el('div', { class: 'iframe' }, [
            this.el('iframe', { src: n.src, width: n.width ?? '100%', height: n.height, loading: 'lazy', allowFullScreen: true, title: n.title ?? 'Embedded content' }),
          ]),
        ];
      case 'table': {
        const rows = n.children ?? [];
        let headCount = 0;
        while (headCount < rows.length && (rows[headCount].children ?? []).every((c) => c.header)) headCount++;
        const renderRows = (rs: MystNode[]) =>
          rs.map((r) =>
            this.el(
              'tr',
              null,
              (r.children ?? []).map((c) => this.el(c.header ? 'th' : 'td', { align: c.align, colSpan: c.colspan, rowSpan: c.rowspan, class: c.class }, this.all(c))),
            ),
          );
        return [
          this.el('div', { class: 'table-wrapper' }, [
            this.el('table', { class: n.class }, [
              ...(headCount ? [this.el('thead', null, renderRows(rows.slice(0, headCount)))] : []),
              this.el('tbody', null, renderRows(rows.slice(headCount))),
            ]),
          ]),
        ];
      }
      case 'code': {
        const value = n.value ?? '';
        const lang = this.lang(n);
        let pre: Element;
        if (this.highlighter && this.themes && lang && this.langs.has(lang)) {
          const root = this.highlighter.codeToHast(value, { lang, themes: this.themes, defaultColor: false });
          pre = root.children[0] as Element;
        } else {
          pre = this.el('pre', null, [this.el('code', { class: n.lang ? `language-${n.lang}` : undefined }, value)]);
        }
        hastClasses(pre).push('code-block', ...(n.showLineNumbers ? ['line-numbers'] : []));
        if (n.showLineNumbers && n.startingLineNumber > 1) {
          pre.properties.style = [pre.properties.style, `counter-reset: line ${n.startingLineNumber - 1}`].filter(Boolean).join('; ');
        }
        const emphasize = new Set<number>(n.emphasizeLines ?? []);
        let line = (n.startingLineNumber ?? 1) - 1;
        for (const child of (pre.children[0] as Element)?.children ?? []) {
          if (child.type !== 'element') continue;
          const list = hastClasses(child);
          if (!list.includes('line')) continue;
          line += 1;
          if (emphasize.has(line)) list.push('highlighted');
        }
        const header = n.filename ? [this.el('div', { class: 'code-filename' }, n.filename)] : [];
        return [this.el('div', { class: cls('code-wrapper', n.class), id: n.label ? id : undefined, dataLang: n.lang }, [...header, pre])];
      }
      case 'mermaid':
        return [this.el('pre', { class: 'mermaid' }, n.value ?? '')];

      // ----- callouts & layout -----------------------------------------------
      case 'admonition': {
        const kind: string = n.kind ?? 'note';
        const children = n.children ?? [];
        const titleNode = children[0]?.type === 'admonitionTitle' ? children[0] : undefined;
        const titleOut = titleNode ? this.all(titleNode) : [text(cap(kind))];
        const body = (titleNode ? children.slice(1) : children).flatMap((c) => this.one(c, n));
        const className = cls('admonition', `admonition-${kind}`, n.class);
        const dropdown = String(n.class ?? '').split(/\s+/).includes('dropdown');
        if (dropdown) {
          return [this.el('details', { class: className, open: n.open }, [this.el('summary', { class: 'admonition-title' }, titleOut), this.el('div', { class: 'admonition-body' }, body)])];
        }
        return [this.el('aside', { class: className, id: n.label ? id : undefined }, [this.el('div', { class: 'admonition-title' }, titleOut), this.el('div', { class: 'admonition-body' }, body)])];
      }
      case 'admonitionTitle':
        return [this.el('div', { class: 'admonition-title' }, kids())];
      case 'proof':
      case 'exercise':
      case 'solution': {
        const kind: string = n.type === 'proof' ? (n.kind ?? 'proof') : n.type;
        const children = n.children ?? [];
        const titleNode = children[0]?.type === 'admonitionTitle' ? children[0] : undefined;
        const body = (titleNode ? children.slice(1) : children).flatMap((c) => this.one(c, n));
        const numbered = Boolean(n.enumerator) && n.enumerated !== false;
        const label = `${cap(kind)}${numbered ? ` ${n.enumerator}` : ''}`;
        const title = titleNode ? [text(' ('), ...this.all(titleNode), text(')')] : [];
        return [
          this.el('aside', { class: cls('proof', `proof-${kind}`, n.class), id: n.label ? id : undefined }, [
            this.el('div', { class: 'proof-title' }, [this.el('strong', null, label), ...title]),
            this.el('div', { class: 'proof-body' }, body),
          ]),
        ];
      }
      case 'details':
        return [this.el('details', { class: n.class, open: n.open }, kids())];
      case 'summary':
        return [this.el('summary', null, kids())];
      case 'aside':
      case 'margin':
      case 'sidebar':
        return [this.el('aside', { class: cls('margin', n.kind, n.class) }, kids())];
      case 'card':
        return [this.el(n.url ? 'a' : 'div', { class: cls('card', n.class), href: n.url ? (this.opts.resolvePageUrl(n.url) ?? n.url) : undefined }, kids())];
      case 'cardTitle':
        return [this.el('div', { class: 'card-title' }, kids())];
      case 'header':
      case 'footer':
        return [this.el('div', { class: `card-${n.type}` }, kids())];
      case 'grid': {
        const cols: number[] = Array.isArray(n.columns) ? n.columns : [1, 1, 2, 2];
        const style = cols.map((c, i) => `--grid-cols-${i}: ${c}`).join('; ');
        return [this.el('div', { class: cls('grid', n.class), style }, kids())];
      }
      case 'tabSet': {
        const set = ++this.tabSets;
        const items = (n.children ?? []).filter((c) => c.type === 'tabItem');
        const selected = Math.max(0, items.findIndex((c) => c.selected));
        return [
          this.el(
            'div',
            { class: 'tab-set' },
            items.flatMap((item, i) => [
              this.el('input', { type: 'radio', name: `tabset-${set}`, id: `tabset-${set}-${i}`, checked: i === selected }),
              this.el('label', { htmlFor: `tabset-${set}-${i}` }, item.title ?? `Tab ${i + 1}`),
              this.el('div', { class: 'tab-panel', role: 'tabpanel' }, this.all(item)),
            ]),
          ),
        ];
      }
      case 'tabItem':
        return [this.el('div', { class: 'tab-panel' }, kids())];
      case 'div':
        return [this.el('div', { class: n.class, style: n.style }, kids())];
      case 'span':
        return [this.el('span', { class: n.class, style: n.style }, kids())];
      case 'si':
        return [this.el('span', { class: 'si', title: n.alt }, n.value ?? toText(n))];
      case 'button':
        return [this.el('a', { class: 'button', href: n.url }, kids())];

      // ----- notebooks ---------------------------------------------------------
      case 'outputs':
        return [this.el('div', { class: 'outputs', id: n.identifier ? id : undefined }, kids())];
      case 'output': {
        if (n.children?.length) return [this.el('div', { class: 'output' }, kids())];
        // mystmd >= 1.7 stores one nbformat output in `jupyter_data`; older versions a list in `data`.
        const outputs: any[] = n.jupyter_data ? [n.jupyter_data] : Array.isArray(n.data) ? n.data : [];
        return outputs.flatMap((o) => this.jupyterOutput(o));
      }

      // ----- unhandled MyST syntax (e.g. directives without a plugin) ---------
      case 'mystDirective':
        return [this.el('div', { class: 'myst-unhandled' }, [this.el('code', null, `{${n.name}} ${n.args ?? ''}`), ...kids()])];
      case 'mystRole':
        return [this.el('span', { class: 'myst-unhandled' }, [this.el('code', null, `{${n.name}}\`${n.value ?? ''}\``)])];

      default: {
        if (n.children) {
          const inline = parent?.type === 'paragraph' || parent?.type === 'heading' || parent?.type === 'caption';
          return [this.el(inline ? 'span' : 'div', { class: `myst-${n.type}`, id: n.label ? id : undefined }, kids())];
        }
        return typeof n.value === 'string' ? [text(n.value)] : [];
      }
    }
  }

  /** Render one nbformat output (stream, error, display_data, execute_result). */
  private jupyterOutput(o: any): HastChild[] {
    const join = (v: unknown) => ([] as unknown[]).concat(v ?? []).join('');
    // Large outputs are moved to files by mystmd: { content_type, hash, path }.
    const content = (entry: any): string | undefined => {
      if (entry == null) return undefined;
      if (typeof entry === 'string' || Array.isArray(entry)) return join(entry);
      if (entry.content !== undefined) return join(entry.content);
      return entry.path ? this.opts.readAsset?.(entry.path) : undefined;
    };
    if (o.output_type === 'stream') {
      const text = (o.path && this.opts.readAsset?.(o.path)) ?? join(o.text);
      return [this.el('pre', { class: cls('output-stream', o.name) }, text)];
    }
    if (o.output_type === 'error') {
      const trace = join(o.traceback).replace(/\u001b\[[0-9;]*m/g, '');
      return [this.el('pre', { class: 'output-error' }, trace || `${o.ename}: ${o.evalue}`)];
    }
    const bundle = o.data ?? {};
    const mime = Object.keys(bundle).find((k) => k.startsWith('image/'));
    if (mime && bundle[mime]?.path) {
      return [this.el('div', { class: 'output' }, [this.el('img', { src: this.opts.resolveAssetUrl(bundle[mime].path), alt: content(bundle['text/plain']) ?? 'Output' })])];
    }
    if (mime && bundle[mime]?.content) {
      const src = mime === 'image/svg+xml' ? `data:${mime};utf8,${encodeURIComponent(content(bundle[mime])!)}` : `data:${mime};base64,${content(bundle[mime])}`;
      return [this.el('div', { class: 'output' }, [this.el('img', { src, alt: 'Output' })])];
    }
    const html = content(bundle['text/html']);
    if (html !== undefined) return [this.el('div', { class: 'output output-html' }, [raw(html)])];
    if (bundle['text/html']?.path) {
      return [this.el('div', { class: 'output' }, [this.el('a', { href: this.opts.resolveAssetUrl(bundle['text/html'].path) }, 'Open output')])];
    }
    const latex = content(bundle['text/latex']);
    if (latex !== undefined) return [this.el('pre', { class: 'output' }, latex)];
    const plain = content(bundle['text/plain']);
    if (plain !== undefined) return [this.el('pre', { class: 'output' }, plain)];
    return [];
  }

  footnotesSection(): HastChild[] {
    if (!this.footnotes.size) return [];
    const title = this.opts.footnotesTitle ?? 'Footnotes';
    const items = [...this.footnotes.entries()].sort((a, b) => Number(a[1].enumerator) - Number(b[1].enumerator));
    return [
      this.el('section', { class: 'footnotes', ariaLabel: title }, [
        this.el('h2', { class: 'footnotes-title' }, title),
        this.el(
          'ol',
          null,
          items.map(([key, { enumerator, node }]) => {
            const content = this.all(node);
            const backref = this.el('a', { class: 'footnote-backref', href: `#fnref-${key}`, ariaLabel: 'Back to text' }, '↩');
            const last = content[content.length - 1];
            if (last?.type === 'element' && last.tagName === 'p') last.children.push(text(' ') as any, backref);
            else content.push(backref);
            return this.el('li', { id: `fn-${key}`, value: Number(enumerator) || undefined }, content);
          }),
        ),
      ]),
    ];
  }

  bibliographySection(): HastChild[] {
    const cite = this.page.references?.cite;
    if (!cite?.order?.length) return [];
    const title = this.opts.bibliographyTitle ?? 'References';
    return [
      this.el('section', { class: 'bibliography', ariaLabel: title }, [
        this.el('h2', null, title),
        this.el(
          'ol',
          { class: cls('bibliography-list', this.opts.numberedReferences && 'numbered') },
          cite.order.map((label, i) => {
            const num = cite.data[label]?.enumerator ?? String(i + 1);
            return this.el('li', { id: citeId(label), dataEnumerator: this.opts.numberedReferences ? num : undefined }, [raw(cite.data[label]?.html ?? label)]);
          }),
        ),
      ]),
    ];
  }
}

/** Render one MyST page (as written by `myst build --site`) to HTML and a heading list. */
export async function renderMystPage(page: MystPageJson, opts: RenderOptions): Promise<RenderResult> {
  const renderer = new MystRenderer(page, opts);
  await renderer.prepare();
  const body = renderer.one(page.mdast);
  const tree = { type: 'root', children: [...body, ...renderer.footnotesSection(), ...renderer.bibliographySection()] };
  return { html: toHtml(tree as any, { allowDangerousHtml: true }), headings: renderer.headings };
}
