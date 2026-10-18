import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEV, expect, test } from './fixtures';

// The minimal example in `astro dev`: MyST assets come from Astro's cache folder through the
// integration's middleware, and edits recompile the collection.
const example = fileURLToPath(new URL('../examples/minimal/', import.meta.url));

test.describe('dev server', () => {
  test('serves MyST assets without writing to public/', async ({ page }) => {
    const responses: { url: string; status: number; type?: string }[] = [];
    page.on('response', (res) => {
      if (res.url().includes('/_myst/'))
        responses.push({ url: res.url(), status: res.status(), type: res.headers()['content-type'] });
    });
    await page.goto(`${DEV}/details`);
    const img = page.locator('figure#fig-dot img');
    await expect(img).toHaveAttribute('src', /^\/_myst\/docs\/dot-[0-9a-f]+\.svg$/);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    expect(responses.length).toBeGreaterThan(0);
    for (const res of responses) expect(res).toMatchObject({ status: 200, type: 'image/svg+xml' });
    expect(fs.existsSync(`${example}public/_myst`)).toBe(false);
    expect(fs.existsSync(`${example}content/_build`)).toBe(false);
  });

  test('recompiles when a page changes', async ({ page }) => {
    const file = `${example}content/details.md`;
    const original = fs.readFileSync(file, 'utf8');
    try {
      fs.writeFileSync(file, `${original}\nEdited while the dev server runs.\n`);
      await expect
        .poll(
          async () => {
            await page.goto(`${DEV}/details`);
            return page.locator('article').textContent();
          },
          { timeout: 30_000 },
        )
        .toContain('Edited while the dev server runs.');
    } finally {
      fs.writeFileSync(file, original);
    }
  });
});
