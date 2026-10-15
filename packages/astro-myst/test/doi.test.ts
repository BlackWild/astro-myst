// DOI citations: `<doi:...>`, `[](doi:...)`, doi.org URLs, `{cite}` roles and `[@doi]`.
// mystmd matches DOIs against the project's .bib files and fetches the rest from
// doi.org, caching the result in `_build/cache`. To keep the test offline we seed that
// cache exactly as mystmd would after a successful download.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileMystProject } from '../src/compile.js';
import { renderMystPage } from '../src/render.js';
import { copyFixture, memoryLogger, PACKAGE_ROOT } from './helpers.js';

const REMOTE_DOI = '10.5281/zenodo.6476040';

function seedDoiCache(root: string) {
  const file = path.join(root, '_build', 'cache', `doi-${createHash('md5').update(REMOTE_DOI).digest('hex')}.csl.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify([
      {
        id: `https://doi.org/${REMOTE_DOI}`,
        type: 'article',
        title: 'A record as returned by doi.org',
        author: [{ family: 'Cockett', given: 'Rowan' }],
        issued: { 'date-parts': [[2022]] },
        DOI: REMOTE_DOI,
        URL: `https://doi.org/${REMOTE_DOI}`,
        publisher: 'Zenodo',
      },
    ]),
  );
}

describe('DOI citations', () => {
  it('turns DOIs into citations with a bibliography, from .bib or from doi.org', async () => {
    const root = copyFixture('doi');
    seedDoiCache(root);
    const { logger, messages } = memoryLogger();
    const build = await compileMystProject({ root, resolveFrom: PACKAGE_ROOT, logger });
    const page = build.pages.get('index')!;
    expect(build.siteOptions).toEqual({});
    const { html } = await renderMystPage(page, { resolvePageUrl: () => undefined, resolveAssetUrl: (u) => u });

    // DOI found in refs.bib -> that BibTeX entry is used
    expect(html).toContain(
      '<a class="cite" href="#cite-schrodinger1926" data-cite="schrodinger1926">Schrödinger (1926)</a>',
    );
    // DOI not in refs.bib -> metadata from doi.org (here: the seeded cache), every syntax
    const remote =
      '<a class="cite" href="#cite-doi-10.5281-zenodo.6476040" data-cite="https://doi.org/10.5281/zenodo.6476040">';
    expect(html.split(remote).length - 1).toBe(5); // [](doi:..), <https://doi.org/..>, {cite:p}, [@..], [text](https://doi.org/..)
    expect(html).toContain(`${remote}Cockett (2022)</a>`);
    expect(html).toContain(`(${remote}Cockett, 2022</a>; <a class="cite" href="#cite-schrodinger1926"`);
    expect(html).toContain(`${remote}our paper</a>`);
    // bibliography: one entry per work, with ids matching the links
    expect(html).toContain('<li id="cite-schrodinger1926">Schrödinger, E. (1926).');
    expect(html).toContain(
      '<li id="cite-doi-10.5281-zenodo.6476040">Cockett, R. (2022). <i>A record as returned by doi.org</i>. Zenodo.',
    );

    // Numbered style (myst.yml `site.options.numbered_references`, or the loader option)
    const numbered = await renderMystPage(page, {
      resolvePageUrl: () => undefined,
      resolveAssetUrl: (u) => u,
      numberedReferences: true,
    });
    expect(numbered.html).toContain(
      '<a class="cite" href="#cite-schrodinger1926" data-cite="schrodinger1926">Schrödinger [1]</a>',
    );
    expect(numbered.html).toContain(
      `[${remote}2</a>, <a class="cite" href="#cite-schrodinger1926" data-cite="schrodinger1926">1</a>]`,
    );
    expect(numbered.html).toContain(
      '<ol class="bibliography-list numbered"><li id="cite-schrodinger1926" data-enumerator="1">',
    );

    // An unknown DOI is reported (with file and line) and stays a plain doi.org link
    expect(messages.some((m) => m.level === 'error' && m.msg.includes('10.9999/does-not-exist'))).toBe(true);
    expect(html).toContain(
      '<a href="https://doi.org/10.9999/does-not-exist" target="_blank" rel="noopener noreferrer">',
    );
  });
});
