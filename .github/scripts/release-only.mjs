// Decides whether a change only releases: the commit of Changesets' "Version Packages" pull
// request, which deletes changesets, updates changelogs and bumps version numbers. Such a change
// contains no code that CI has not already tested on main, so the expensive jobs can be skipped.
//
//   node .github/scripts/release-only.mjs <base> [head]
//
// Prints the reason and, in GitHub Actions, writes `release-only=true|false` to $GITHUB_OUTPUT.
// Anything unexpected (an unknown base, another file, another changed line) means `false`.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const [base, head = 'HEAD'] = process.argv.slice(2);

/** Files a version bump may change, and the lines it may change in them (all lines if `null`). */
const RULES = [
  { file: /^\.changeset\/[^/]+\.md$/, lines: null },
  { file: /(^|\/)CHANGELOG\.md$/, lines: null },
  { file: /(^|\/)package\.json$/, lines: /^\s*"version": "[^"]+",?$/ },
  // `npm install --package-lock-only` also normalizes the dependency-type flags of entries; they
  // change no installed version.
  { file: /^package-lock\.json$/, lines: /^\s*("version": "[^"]+"|"(dev|optional|devOptional|peer)": true),?$/ },
  { file: /^packages\/astro-myst\/src\/version\.ts$/, lines: /^export const VERSION = '[^']+';$/ },
];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

function check() {
  if (!base || /^0+$/.test(base)) return [false, 'no base commit to compare with'];
  let files;
  try {
    files = git('diff', '--name-only', '--no-renames', base, head).split('\n').filter(Boolean);
  } catch {
    return [false, `cannot compare ${base} with ${head}`];
  }
  if (files.length === 0) return [false, 'no changed files'];
  for (const file of files) {
    const rule = RULES.find((r) => r.file.test(file));
    if (!rule) return [false, `${file} changed`];
    if (!rule.lines) continue;
    const changed = git('diff', '--unified=0', '--no-renames', base, head, '--', file)
      .split('\n')
      .filter((line) => /^[+-]/.test(line) && !/^(\+\+\+|---) /.test(line));
    const other = changed.find((line) => !rule.lines.test(line.slice(1)));
    if (other !== undefined) return [false, `${file}: ${other.trim()}`];
  }
  return [true, `only version bumps and changelogs (${files.length} files)`];
}

const [releaseOnly, reason] = check();
console.log(`release-only=${releaseOnly}: ${reason}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `release-only=${releaseOnly}\n`);
