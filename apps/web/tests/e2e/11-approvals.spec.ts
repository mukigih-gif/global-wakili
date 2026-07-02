import { test, expect, Page } from '@playwright/test';

/**
 * 11-approvals.spec.ts — Approvals module (Phase 2).
 *
 * Approvals hub loads for an authenticated user; the requests table renders and
 * the Pending/All filter toggles without a 500. Read-only — no approve/reject
 * writes (those would mutate real approval state).
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

test.describe('Approvals module', () => {
  test('approvals hub loads and filter toggles', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);
    const failures: string[] = [];

    await page.locator('aside').getByRole('link', { name: 'Approvals', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/approvals$/, { timeout: 15_000 });
    await page.mouse.move(960, 320); // collapse hover-sidebar
    await expect(page.locator('h1').first()).toBeVisible();

    const noBoundary = async (label: string) => {
      const body = (await page.locator('body').innerText().catch(() => '')) || '';
      if (body.includes('Something went wrong')) failures.push(`${label} → 500 error boundary`);
      if (body.includes('Page not found')) failures.push(`${label} → 404 not found`);
    };
    await noBoundary('Approvals (Pending)');
    // Requests table renders (headers present)
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByText('Requested By')).toBeVisible();
    await page.waitForTimeout(1200);

    // Toggle to the "All" filter — should reload without a 500.
    const allBtn = page.locator('main').getByRole('button', { name: /^all\b/i }).first();
    if (await allBtn.count()) {
      await allBtn.click();
      await page.waitForTimeout(1500);
      await noBoundary('Approvals (All)');
      await expect(page.locator('table')).toBeVisible();
    } else {
      failures.push('Approvals → "All" filter button not found');
    }

    expect(failures, `\n${failures.length} approvals failure(s):\n${failures.join('\n')}\n`).toEqual([]);
  });
});
