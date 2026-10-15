import { DOCS, expect, test } from './fixtures';

test.describe('documentation site', () => {
  test('links respect the /astro-myst base path', async ({ page }) => {
    await page.goto(`${DOCS}/`);
    await page.locator('.sidebar a', { hasText: 'Getting started' }).click();
    await expect(page).toHaveURL(/\/astro-myst\/getting-started$/);
    await expect(page.locator('h1')).toHaveText('Getting started');
  });

  test('cross-references between docs pages resolve', async ({ page }) => {
    await page.goto(`${DOCS}/guides/writing-content`);
    const xref = page.locator('a.xref[href="/astro-myst#eq-photon"]');
    await expect(xref).toHaveText('(1)');
    await xref.click();
    await expect(page.locator('#eq-photon')).toBeVisible();
  });

  test('search finds pages', async ({ page }) => {
    await page.goto(`${DOCS}/`);
    const input = page.locator('#search input');
    await input.fill('DOI');
    await expect(page.locator('.pagefind-ui__result').first()).toBeVisible();
  });
});
