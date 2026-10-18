import { expect, PAPER, test } from './fixtures';

test.describe('paper example (LaTeX + Markdown supplement)', () => {
  test('the article references the supplement with S-numbers', async ({ page }) => {
    await page.goto(`${PAPER}/`);
    await expect(page.locator('h1')).toHaveText('Decoherence of a driven qubit');
    await expect(page.locator('a.myst-xref[href="/supplement#fig-s-bloch"]')).toHaveText('S1');
    await expect(page.locator('#tab-params .myst-caption-number')).toContainText('Table 1');
  });

  test('the supplement references the LaTeX article', async ({ page }) => {
    await page.goto(`${PAPER}/supplement`);
    await expect(page.locator('#eq-s-envelope .myst-equation-number')).toHaveText('(S1)');
    await page.locator('a.myst-xref[href="/#eq-lindblad"]').click();
    await expect(page).toHaveURL(/\/#eq-lindblad$/);
  });
});
