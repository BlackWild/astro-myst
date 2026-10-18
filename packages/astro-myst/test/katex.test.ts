// `katex` is a dependency only for its stylesheet (astro-myst/katex.css): mystmd renders math
// with its own bundled KaTeX. KaTeX renames its classes between versions, so the stylesheet
// must come from exactly the KaTeX version that mystmd bundles.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKAGE_ROOT } from './helpers.js';

const require = createRequire(path.join(PACKAGE_ROOT, 'noop.js'));
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

function mystmdKatexVersion(): string | undefined {
  const pkgJsonPath = require.resolve('mystmd/package.json');
  const { bin } = readJson(pkgJsonPath);
  const bundle = fs.readFileSync(
    path.join(path.dirname(pkgJsonPath), typeof bin === 'string' ? bin : bin.myst),
    'utf8',
  );
  return bundle.match(/Current KaTeX version\s*\*\/\s*version:\s*"([\d.]+)"/)?.[1];
}

describe('katex dependency', () => {
  it('is the KaTeX version bundled in mystmd', () => {
    const bundled = mystmdKatexVersion();
    expect(bundled, 'KaTeX version in the mystmd bundle').toBeDefined();
    const declared = readJson(path.join(PACKAGE_ROOT, 'package.json')).dependencies.katex;
    const installed = readJson(require.resolve('katex/package.json')).version;
    expect({ declared, installed }, `set "katex": "${bundled}" in packages/astro-myst/package.json`).toEqual({
      declared: bundled,
      installed: bundled,
    });
  });
});
