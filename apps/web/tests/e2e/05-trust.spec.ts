import { test, expect, Page } from '@playwright/test';

/**
 * 05-trust.spec.ts — Trust accounting UI + ADR-004 overdraw guard (Phase 2).
 *
 * - Trust list loads for an authenticated user (seeded accounts present).
 * - Overdraw guard: attempting a withdrawal that exceeds available client trust
 *   funds is REJECTED (error shown, stays on the form). This exercises ADR-004
 *   ("no negative trust balances") via a rejected write — no balance is changed.
 *
 * Read-safe: the only write attempted is an over-withdrawal, which the API
 * blocks; nothing is persisted.
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

test.describe('Trust accounting', () => {
  test('trust list loads for an authenticated user', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await page.locator('aside').getByRole('link', { name: 'Trust Accounting', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/trust$/, { timeout: 15_000 });
    await expect(page.locator('aside')).toBeVisible();
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    expect(body).not.toContain('Something went wrong');
    expect(body).not.toContain('Page not found');
    // Trust page heading renders
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('overdraw guard blocks a withdrawal exceeding available funds (ADR-004)', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);
    await page.locator('aside').getByRole('link', { name: 'Trust Accounting', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/trust$/, { timeout: 15_000 });
    await page.getByRole('link', { name: 'Withdraw' }).first().click();
    await expect(page).toHaveURL(/\/app\/trust\/withdraw$/, { timeout: 15_000 });

    // Wait for the account dropdown to populate (a real option beyond the placeholder).
    const accountSelect = page.locator('select').nth(0);
    await accountSelect.locator('option').nth(1).waitFor({ state: 'attached', timeout: 20_000 });
    await accountSelect.selectOption({ index: 1 });
    await page.locator('select').nth(1).selectOption({ index: 1 }); // client

    await page.getByPlaceholder('0.00').fill('99999999'); // far exceeds any balance
    await page.getByPlaceholder('e.g. withdrawal authority ref').fill('E2E-OVERDRAW-TEST');
    await page.getByRole('button', { name: 'Record Withdrawal' }).click();

    // Guard must reject: error banner appears and we stay on the form.
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/app\/trust\/withdraw$/);
  });
});
