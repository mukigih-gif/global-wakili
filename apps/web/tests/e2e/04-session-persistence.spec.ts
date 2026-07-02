import { test, expect, Page } from '@playwright/test';

/**
 * 04-session-persistence.spec.ts — regression coverage for AUTH-SESSION-002.
 *
 * The JWT lives in localStorage (not sessionStorage) so the session survives
 * page refresh AND new tabs / deep links / browser restarts (until the JWT
 * expires). This spec guards that behavior so it can't silently regress back
 * to "seeds & fixes not visible on a fresh tab".
 */

const EMAIL    = process.env.E2E_EMAIL    ?? 'admin@yourlawfirm.co.ke';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin@2026!';
const TENANT   = process.env.E2E_TENANT   ?? 'demo-law-firm';

async function seedConsent(page: Page) {
  await page.addInitScript(() => {
    try { window.localStorage.setItem('gw_cookie_consent', JSON.stringify({ necessary: true, version: '1.0' })); } catch { /* ignore */ }
  });
}

async function login(page: Page) {
  await seedConsent(page);
  await page.goto('/login');
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder('your-firm-id').fill(TENANT);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 25_000 });
}

test.describe('Session persistence (localStorage)', () => {
  test('token is stored in localStorage on login', async ({ page }) => {
    await login(page);
    const token = await page.evaluate(() => localStorage.getItem('gw_token'));
    expect(token).toBeTruthy();
  });

  test('session + data survive a full page refresh', async ({ page }) => {
    await login(page);
    await page.locator('aside').getByRole('link', { name: 'Clients', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/clients$/, { timeout: 15_000 });
    await page.locator('table a[href^="/app/clients/"]').first().waitFor({ state: 'visible', timeout: 20_000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    // still authenticated (not bounced to /login) and rows reload
    await expect(page).toHaveURL(/\/app\/clients$/, { timeout: 10_000 });
    await page.locator('table a[href^="/app/clients/"]').first().waitFor({ state: 'visible', timeout: 25_000 });
    expect(await page.evaluate(() => localStorage.getItem('gw_token'))).toBeTruthy();
  });

  test('session persists in a new tab / deep link', async ({ page, context }) => {
    await login(page);
    // New tab in the SAME context shares localStorage — a deep link should NOT bounce to /login.
    const tab2 = await context.newPage();
    await seedConsent(tab2);
    await tab2.goto('/app/clients', { waitUntil: 'domcontentloaded' });
    await expect(tab2).toHaveURL(/\/app\/clients$/, { timeout: 20_000 });
    expect(await tab2.evaluate(() => localStorage.getItem('gw_token'))).toBeTruthy();
    await tab2.locator('table a[href^="/app/clients/"]').first().waitFor({ state: 'visible', timeout: 25_000 });
    await tab2.close();
  });

  test('logout clears the session', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('gw_token'))).toBeFalsy();
  });
});
