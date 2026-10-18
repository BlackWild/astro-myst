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
    const xref = page.locator('a.myst-xref[href="/astro-myst#eq-photon"]');
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

  test('the optional scripts: tab sync, copy buttons and Mermaid diagrams', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${DOCS}/guides/writing-content`);

    // Tabs with the same :sync: key switch together.
    const [install, run] = [page.locator('.myst-tabs').nth(0), page.locator('.myst-tabs').nth(1)];
    await install.locator('label', { hasText: 'pnpm' }).click();
    await expect(run.locator('.myst-tab-panel:visible')).toContainText('pnpm dev');

    // A copy button on code blocks copies the code.
    const code = page.locator('.myst-code-wrapper', { hasText: 'defineCollection' });
    await code.hover();
    await code.locator('button.myst-code-copy').click();
    await expect(code.locator('button.myst-code-copy')).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      "import { defineCollection } from 'astro:content';",
    );

    // Mermaid draws the diagram.
    await expect(page.locator('pre.mermaid svg')).toBeVisible();
    await expect(page.locator('pre.mermaid svg')).toContainText('mystmd');
  });
});
