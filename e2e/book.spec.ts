import { BOOK, expect, test } from './fixtures';

test.describe('book example', () => {
  test('renders numbered content with KaTeX', async ({ page }) => {
    await page.goto(`${BOOK}/`);
    await expect(page.locator('h1')).toContainText('Introduction');
    await expect(page.locator('h2#sec-motivation .heading-number')).toHaveText('1.1');
    await expect(page.locator('figure#fig-signal .caption-number')).toContainText('Figure 1');
    const katexFont = await page
      .locator('.math-inline .katex')
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(katexFont).toContain('KaTeX');
  });

  test('cross-page references navigate to the target', async ({ page }) => {
    await page.goto(`${BOOK}/results`);
    await page.locator('a.xref[href="/theory#eq-schrodinger"]').first().click();
    await expect(page).toHaveURL(/\/theory#eq-schrodinger$/);
    await expect(page.locator('#eq-schrodinger .equation-number')).toHaveText('(1)');
  });

  test('hovering a reference shows a preview from another page', async ({ page }) => {
    await page.goto(`${BOOK}/results`);
    await page.locator('a.xref[href="/theory#eq-evolution"]').first().hover();
    const preview = page.locator('.myst-preview');
    await expect(preview).toBeVisible();
    await expect(preview.locator('.equation-number')).toHaveText('(3)');
    await page.keyboard.press('Escape');
    await expect(preview).toHaveCount(0);
  });

  test('renders the LaTeX page with abstract, numbers and citations', async ({ page }) => {
    await page.goto(`${BOOK}/derivation`);
    await expect(page.locator('h1')).toContainText('A derivation written in LaTeX');
    await expect(page.locator('section.myst-part-abstract')).toContainText('plain .tex file');
    await expect(page.locator('#eq-packet .equation-number')).toHaveText('(5)');
    await expect(page.locator('section.bibliography li')).toHaveCount(2);
  });

  test('renders notebook outputs', async ({ page }) => {
    await page.goto(`${BOOK}/notebook`);
    await expect(page.locator('.output-stream')).toContainText('E_n / hbar omega');
    await expect(page.locator('.outputs img')).toBeVisible();
  });

  test('tabs switch without JavaScript frameworks', async ({ page }) => {
    await page.goto(`${BOOK}/oscillator`);
    const panels = page.locator('.tab-set .tab-panel');
    await expect(panels.nth(0)).toBeVisible();
    await page.locator('.tab-set label', { hasText: 'Ground state' }).click();
    await expect(panels.nth(1)).toBeVisible();
    await expect(panels.nth(0)).toBeHidden();
  });
});
