import { test, expect, Page } from '@playwright/test';

/**
 * 12-write-guards.spec.ts — SAFE rejected-write coverage (Phase 2).
 *
 * Exercises write PATHS without persisting anything: each attempt is rejected
 * by validation, so no record is created (no prod-data pollution). Complements
 * the trust overdraw guard (server 422) already covered in 05-trust.
 *
 * Covered here (Billing / New Invoice — client-side guards, no POST fired):
 *   - submit with no client → blocked ("Select a client before saving.")
 *   - submit with a client but no line-item description → blocked
 *     ("Add at least one line item.")
 * Also regression-guards the FRONT-015 fix (Save Draft shares the guarded path).
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

/**
 * Reach the New Invoice form via SPA navigation (sidebar → Billing → New Invoice).
 * A hard page.goto() to this deep route re-runs fetchMe() and, under a degraded/
 * cold-starting API, can bounce to /login — SPA nav keeps the authed context.
 */
async function gotoNewInvoice(page: Page) {
  await page.locator('aside').getByRole('link', { name: 'Billing', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/billing$/, { timeout: 20_000 });
  // Move cursor off the sidebar so the hover-overlay collapses and stops covering content.
  await page.mouse.move(960, 320);
  // "New Invoice" only renders on the Invoices tab (billing defaults to Quotations).
  await page.getByRole('button', { name: 'Invoices' }).first().click();
  await page.locator('main').getByRole('link', { name: 'New Invoice' }).first().click();
  await expect(page).toHaveURL(/\/app\/billing\/new$/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible({ timeout: 15_000 });
}

test.describe('Safe write guards (rejected writes, nothing persists)', () => {
  test('New Invoice blocks submit with no client', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await gotoNewInvoice(page);

    // "Save Draft" uses the shared guarded createInvoice() (FRONT-015). With no
    // client selected it must block and surface the guard — no POST, no record.
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText('Select a client before saving.')).toBeVisible({ timeout: 10_000 });
    // Still on the form (no navigation to /app/billing on success).
    await expect(page).toHaveURL(/\/app\/billing\/new$/);
  });

  test('New Invoice blocks submit with a client but no line item', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await gotoNewInvoice(page);

    // Pick the first real client, clear the line description, then attempt save.
    const clientSelect = page.locator('select').first();
    await clientSelect.locator('option').nth(1).waitFor({ state: 'attached', timeout: 20_000 });
    await clientSelect.selectOption({ index: 1 });

    const desc = page.getByPlaceholder('Description…').first();
    await desc.fill(''); // ensure no line description
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText('Add at least one line item.')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/app\/billing\/new$/);
  });
});
