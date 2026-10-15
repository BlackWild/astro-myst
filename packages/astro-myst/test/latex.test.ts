// LaTeX sources (.tex) are parsed by mystmd's tex-to-myst and end up as the same
// AST as MyST Markdown, so they render through the same pipeline.
import { describe, expect, it } from 'vitest';
import { compileMystProject } from '../src/compile.js';
import { renderMystPage } from '../src/render.js';
import { copyFixture, memoryLogger, PACKAGE_ROOT } from './helpers.js';

describe('LaTeX content (.tex pages)', () => {
  it('compiles and renders a LaTeX document alongside Markdown, with references both ways', async () => {
    const root = copyFixture('latex');
    const { logger, messages } = memoryLogger();
    const build = await compileMystProject({ root, resolveFrom: PACKAGE_ROOT, logger });
    expect(messages.filter((m) => m.level === 'error')).toEqual([]);

    const paper = build.pages.get('index')!;
    expect(paper.location).toBe('/paper.tex');
    expect(paper.frontmatter.title).toBe('Paper in TeX');
    expect(paper.frontmatter.authors.map((a: any) => a.name)).toEqual(['Ada Lovelace']);

    const opts = { resolvePageUrl: (u: string) => (u === '/' ? '/paper' : u), resolveAssetUrl: (u: string) => `/_myst${u}` };
    const { html, headings } = await renderMystPage(paper, opts);
    // \begin{abstract} becomes a document part
    expect(html).toContain('<section class="myst-part myst-part-abstract" data-part="abstract"><h2 class="part-title">Abstract</h2><p>An abstract written in TeX.</p></section>');
    // \label / \eqref / numbered equation, theorem and figure
    expect(html).toMatch(/<div class="math-display" id="eq-main">.*<span class="equation-number">\(1\)<\/span><\/div>/);
    expect(html).toContain('<a class="xref" href="#eq-main" data-xref-kind="equation">(1)</a>');
    expect(html).toContain('<aside class="proof proof-theorem" id="thm-tex"><div class="proof-title"><strong>Theorem 1</strong></div>');
    expect(html).toMatch(/<figure id="fig-tex" class="myst-container myst-figure numbered"[^>]*><img src="\/_myst\/dot-[0-9a-f]+\.svg"/);
    // \ref into the Markdown page, \cite from refs.bib, \footnote, \input{methods}, siunitx
    expect(html).toContain('<a class="xref" href="/notes#fig-md" data-xref-kind="figure" data-xref-remote="true">1</a>');
    expect(html).toContain('<a class="cite" href="#cite-knuth1984" data-cite="knuth1984">Knuth (1984)</a>');
    expect(html).toContain('<li id="cite-knuth1984">');
    expect(html).toMatch(/<section class="footnotes"[^>]*>.*TeX footnote\./);
    expect(headings.map((h) => h.slug)).toEqual(['sec-intro', 'sec-methods']);
    expect(html).toContain('<span class="si" title="milli second">3.0');
    // \newcommand text macros are expanded, \citep is parenthetical
    expect(html).toContain('Every TeX theorem in Astro-MyST gets a number <span class="cite-group">(<a class="cite"');

    // ... and the Markdown page references the LaTeX labels (colons in labels are fine)
    const notes = await renderMystPage(build.pages.get('notes')!, opts);
    expect(notes.html).toContain('<a class="xref" href="/paper#eq-main" data-xref-kind="equation" data-xref-remote="true">(1)</a>');
    expect(notes.html).toContain('href="/paper#fig-tex"');
    expect(notes.html).toContain('href="/paper#thm-tex"');
    expect(notes.html).toContain('href="/paper#sec-methods"');
    // a .tex snippet pulled into Markdown with {include}
    expect(notes.html).toContain('<strong>bold</strong> included from Markdown');
  });
});
