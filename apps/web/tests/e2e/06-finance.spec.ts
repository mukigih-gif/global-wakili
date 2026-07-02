import { test, expect, Page } from '@playwright/test';

/**
 * 06-finance.spec.ts — Finance module tabs (Phase 2).
 *
 * One authenticated session opens Finance and exercises each key tab:
 *   - Chart of Accounts renders the seeded accounts (data present)
 *   - Journal Entries loads (FINDING-007-014 — used to 500)
 *   - P&L / Balance Sheet renders (FINDING-FIN-I-001)
 * Asserts each tab renders without the 500 error boundary. Read-only.
 */

const EMAIL    = process.env.E2E_EMAIL    ?? 'admin@yourlawfirm.co.ke';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin@2026!';
const TENANT   = process.env.E2E_TENANT   ?? 'demo-law-firm';

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

const noError = async (page: Page, label: string, failures: string[]) => {
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  if (body.includes('Something went wrong')) failures.push(`${label} → 500 error boundary`);
};

test.describe('Finance module', () => {
  test('finance tabs load for an authenticated user', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    const failures: string[] = [];

    await page.locator('aside').getByRole('link', { name: 'Finance', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/finance$/, { timeout: 15_000 });
    await expect(page.locator('h1').first()).toBeVisible();
    await noError(page, 'Finance overview', failures);

    // Chart of Accounts — seeded (should render account rows).
    // Tab bar renders before the overview quick-links (which also have this label) → .first() = the tab.
    await page.getByRole('button', { name: 'Chart of Accounts' }).first().click();
    await page.waitForTimeout(2500);
    await noError(page, 'Chart of Accounts', failures);
    const acctRows = await page.locator('table tbody tr').count().catch(() => 0);
    const acctBody = (await page.locator('table').first().innerText().catch(() => '')) || '';
    if (acctRows === 0 || acctBody.includes('No accounts in chart')) {
      failures.push(`Chart of Accounts → no account rows rendered (seeded accounts expected)`);
    }

    // Journal Entries — used to 500 (FINDING-007-014)
    await page.getByRole('button', { name: 'Journal Entries' }).first().click();
    await page.waitForTimeout(2500);
    await noError(page, 'Journal Entries', failures);
    await expect(page.locator('table')).toBeVisible();

    // P&L / Balance Sheet
    await page.getByRole('button', { name: 'P&L / Balance Sheet' }).click();
    await page.waitForTimeout(2500);
    await noError(page, 'P&L / Balance Sheet', failures);

    expect(failures, `\n${failures.length} finance failure(s):\n${failures.join('\n')}\n`).toEqual([]);
  });
});
