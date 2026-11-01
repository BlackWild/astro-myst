import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The peer dependency ranges are what astro-myst promises its users. Dependabot rewrites them when
// it moves a workspace to a new major (it once replaced mermaid's `^10.0.0 || ^11.0.0` with
// `^12.2.0`), which would drop support for the older majors without anyone deciding to. Change
// them on purpose: test the new version, widen the range, add a changeset, then update this test.
describe('peerDependencies', () => {
  it('keeps the supported ranges', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.peerDependencies).toEqual({
      astro: '^5.0.0 || ^6.0.0 || ^7.0.0',
      mystmd: '^1.3.0',
      mermaid: '^10.0.0 || ^11.0.0 || ^12.0.0',
    });
  });
});
