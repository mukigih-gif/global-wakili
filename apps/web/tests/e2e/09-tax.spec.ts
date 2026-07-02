import { test, expect, Page } from '@playwright/test';

/**
 * 09-tax.spec.ts — Tax Compliance tabs (Phase 2).
 *
 * Logs in as an ACCOUNTANT (the role that actually works tax) and exercises the
 * /app/tax tabs that ACCOUNTANT can access:
 *   - VAT (summary + VAT Adjustments list — demo-law-firm has 2 adjustments)
 *   - Withholding Tax
 *   - eTIMS / KRA
 * Asserts each renders without the 500 error boundary. Payroll Deductions is
 * intentionally NOT data-asserted here — it is HR-gated (ACCOUNTANT gets 403,
 * correct RBAC). Read-only.
 */

const EMAIL    = process.env.E2E_TAX_EMAIL    ?? 'accounts@demo-law-firm.co.ke';
const PASSWORD = process.env.E2E_TAX_PASSWORD ?? 'CertPass2026!';
const TENANT   = process.env.E2E_TENANT       ?? 'demo-law-firm';

async function login(page: Page) {
  await page.addInitScript(() => {
    try { window.localStorage.setItem('gw_cookie_consent', JSON.stringify({ necessary: true, version: '1.0' })); } catch { /* ignore */ }
  });
  await page.goto('/login');
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder('your-firm-id').fill(TENANT);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 25_000 });
}

const noBoundary = async (page: Page, label: string, failures: string[]) => {
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  if (body.includes('Something went wrong')) failures.push(`${label} → 500 error boundary`);
};

test.describe('Tax Compliance', () => {
  test('tax tabs load for an ACCOUNTANT', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    const failures: string[] = [];

    await page.locator('aside').getByRole('link', { name: 'Tax Compliance', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/tax$/, { timeout: 15_000 });
    // Collapse the hover-sidebar so it doesn't overlay the top tab bar.
    await page.mouse.move(960, 320);
    await expect(page.locator('h1').first()).toBeVisible();
    await noBoundary(page, 'Tax (VAT default)', failures);

    // VAT tab (default) — VAT Adjustments section renders (heading), with seeded rows.
    await expect(page.getByRole('heading', { name: 'VAT Adjustments' })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3000); // let the adjustments fetch populate
    if ((await page.getByText('No VAT adjustments recorded').count()) > 0) {
      failures.push('VAT Adjustments → list empty in UI despite API returning 2 for this ACCOUNTANT (FE data/render gap)');
    }

    // Withholding Tax tab
    await page.getByRole('button', { name: 'Withholding Tax' }).first().click();
    await page.waitForTimeout(1500);
    await noBoundary(page, 'Withholding Tax', failures);
    await expect(page.locator('h1').first()).toBeVisible();

    // eTIMS / KRA tab
    await page.getByRole('button', { name: 'eTIMS / KRA' }).first().click();
    await page.waitForTimeout(1500);
    await noBoundary(page, 'eTIMS / KRA', failures);
    await expect(page.locator('h1').first()).toBeVisible();

    expect(failures, `\n${failures.length} tax failure(s):\n${failures.join('\n')}\n`).toEqual([]);
  });
});
