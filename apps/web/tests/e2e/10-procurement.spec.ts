import { test, expect, Page } from '@playwright/test';

/**
 * 10-procurement.spec.ts — Procurement module tabs (Phase 2).
 *
 * One authenticated pass over /app/procurement tabs: Dashboard, Purchase
 * Requests, Purchase Orders, Vendor Register, Bills & Invoices. Each must
 * render without the 500 error boundary. Read-only (no approve/reject writes).
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

const TABS = ['Purchase Requests', 'Purchase Orders', 'Vendor Register', 'Bills & Invoices'];

test.describe('Procurement module', () => {
  test('procurement tabs load for an authenticated user', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    const failures: string[] = [];

    await page.locator('aside').getByRole('link', { name: 'Procurement', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/procurement$/, { timeout: 15_000 });
    await page.mouse.move(960, 320); // collapse hover-sidebar off the tab bar
    await expect(page.locator('h1').first()).toBeVisible();
    const dashBody = (await page.locator('body').innerText().catch(() => '')) || '';
    if (dashBody.includes('Something went wrong')) failures.push('Procurement Dashboard → 500 error boundary');

    for (const tab of TABS) {
      await page.getByRole('button', { name: tab }).first().click();
      await page.waitForTimeout(1800);
      const body = (await page.locator('body').innerText().catch(() => '')) || '';
      if (body.includes('Something went wrong')) failures.push(`${tab} → 500 error boundary`);
      else if (body.includes('Page not found')) failures.push(`${tab} → 404 not found`);
      else if (!(await page.locator('h1').first().isVisible().catch(() => false))) failures.push(`${tab} → no heading`);
    }

    expect(failures, `\n${failures.length} procurement failure(s):\n${failures.join('\n')}\n`).toEqual([]);
  });
});
