import { test as base, expect } from '@playwright/test';

/** Fails a test when the page throws, logs errors or loads a missing resource. */
export const test = base.extend<{ pageProblems: string[] }>({
  pageProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));
      page.on('console', (msg) => {
        // HTTP failures are reported with their URL below.
        if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) problems.push(msg.text());
      });
      page.on('response', (res) => {
        if (res.status() >= 400 && !res.url().endsWith('/favicon.ico')) problems.push(`${res.status()} ${res.url()}`);
      });
      await use(problems);
      expect(problems, 'errors on the page').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const BOOK = 'http://127.0.0.1:4321';
export const PAPER = 'http://127.0.0.1:4322';
export const DOCS = 'http://127.0.0.1:4323/astro-myst';
