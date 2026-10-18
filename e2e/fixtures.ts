import { test as base, expect } from '@playwright/test';

/** Fails a test when the page throws, logs errors or loads a missing resource. */
export const test = base.extend<{ pageProblems: string[] }>({
  pageProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));
      page.on('console', (msg) => {
        // HTTP failures are reported with their URL below. Astro's dev toolbar logs failures of its
        // own audits (e.g. a request cut off by a reload), which say nothing about the page.
        const text = msg.text();
        if (msg.type() !== 'error' || text.startsWith('Failed to load resource')) return;
        if (text.startsWith('%cAstro') && text.includes("Error while running audit's")) return;
        problems.push(text);
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
export const DEV = 'http://127.0.0.1:4324';
