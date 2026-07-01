import { test, expect, Page } from '@playwright/test';

/**
 * 01-auth.spec.ts — Authentication E2E (Phase 2, first spec).
 *
 * Runs against the DEPLOYED frontend (playwright.config baseURL) which talks
 * to the Render API + Neon (ep-withered-haze, test data).
 *
 * Credentials come from env with demo defaults so nothing secret is baked in:
 *   E2E_EMAIL / E2E_PASSWORD / E2E_TENANT
 *
 * Lockout-safety (F-19 fires at 5 failed attempts): the invalid-credentials
 * test uses a throwaway email so it never targets the real admin; the
 * wrong-tenant test uses a bad slug so the user is never matched (no failed
 * attempt is recorded against the real account). Only the happy-path + logout
 * tests use real creds, and each success resets the counter.
 */

const EMAIL    = process.env.E2E_EMAIL    ?? 'admin@yourlawfirm.co.ke';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin@2026!';
const TENANT   = process.env.E2E_TENANT   ?? 'demo-law-firm';

async function fillLogin(page: Page, email: string, password: string, tenant?: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  if (tenant !== undefined) await page.getByPlaceholder('your-firm-id').fill(tenant);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('Authentication', () => {
  // Pre-seed cookie-consent so the fixed-bottom banner never intercepts clicks
  // on the login form (equivalent to a returning user who already consented).
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('gw_cookie_consent', JSON.stringify({
          necessary: true, analytics: false, marketing: false, functional: false,
          timestamp: new Date().toISOString(), version: '1.0',
        }));
      } catch { /* ignore */ }
    });
  });

  test('valid credentials → redirect to dashboard', async ({ page }) => {
    await fillLogin(page, EMAIL, PASSWORD, TENANT);
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 25_000 });
    // Session token is persisted on success.
    const token = await page.evaluate(() => sessionStorage.getItem('gw_token'));
    expect(token).toBeTruthy();
  });

  test('invalid credentials → error shown, stays on /login', async ({ page }) => {
    await fillLogin(page, 'e2e-nonexistent@example.com', 'WrongPassword!1', TENANT);
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 25_000 });
    await expect(page).toHaveURL(/\/login/);
    const token = await page.evaluate(() => sessionStorage.getItem('gw_token'));
    expect(token).toBeFalsy();
  });

  test('wrong tenant → error shown, stays on /login', async ({ page }) => {
    await fillLogin(page, EMAIL, PASSWORD, 'no-such-firm-xyz');
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 25_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to protected route → redirect to /login', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 25_000 });
  });

  test('logout → redirect to /login, session cleared', async ({ page }) => {
    await fillLogin(page, EMAIL, PASSWORD, TENANT);
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 25_000 });

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    const token = await page.evaluate(() => sessionStorage.getItem('gw_token'));
    expect(token).toBeFalsy();
  });
});
