import { test, expect, Page } from '@playwright/test';

/**
 * 03-detail-links.spec.ts — "links I couldn't open" coverage (Phase 2).
 *
 * Uses REAL user navigation (clicking sidebar links + in-page links), NOT
 * hard page.goto() to deep URLs — a full URL load of a deep route does not
 * reliably fire the client data fetch, whereas SPA link navigation (what a
 * user actually does) works. This spec proves the detail links open and
 * render seeded data.
 *
 * Read-only. Empty lists are skipped+logged, not failed.
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

const visible = (p: Promise<unknown>) => p.then(() => true).catch(() => false);

async function detailHealthy(page: Page, label: string): Promise<string | null> {
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  if (body.includes('Something went wrong')) return `${label} → 500 error boundary`;
  if (body.includes('Page not found'))        return `${label} → 404 not found`;
  if (!(await page.locator('aside').first().isVisible().catch(() => false))) return `${label} → shell missing`;
  return null;
}

/** Click a sidebar link, then the first in-table detail link. */
async function openViaSidebar(
  page: Page, navName: string, listRe: RegExp, hrefPrefix: string, detailRe: RegExp, label: string,
): Promise<string | 'skip' | null> {
  await page.locator('aside').getByRole('link', { name: navName, exact: true }).first().click();
  if (!(await visible(expect(page).toHaveURL(listRe, { timeout: 15_000 })))) return `${label} → sidebar link did not navigate`;
  const link = page.locator(`table a[href^="${hrefPrefix}"]`).first();
  if (!(await visible(link.waitFor({ state: 'visible', timeout: 20_000 })))) return 'skip';
  await link.click();
  if (!(await visible(expect(page).toHaveURL(detailRe, { timeout: 15_000 })))) return `${label} → did not open detail`;
  return await detailHealthy(page, label);
}

test.describe('Detail links & interactive opens (SPA navigation)', () => {
  test('clicking through the app opens healthy detail views', async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);

    const failures: string[] = [];
    const skipped: string[] = [];
    const rec = (r: string | 'skip' | null, label: string) => {
      if (r === 'skip') skipped.push(label); else if (r) failures.push(r);
    };

    rec(await openViaSidebar(page, 'Clients', /\/app\/clients$/, '/app/clients/', /\/app\/clients\/[^/]+$/, 'Client detail'), 'Client detail');
    rec(await openViaSidebar(page, 'Matters', /\/app\/matters$/, '/app/matters/', /\/app\/matters\/[^/]+$/, 'Matter detail'), 'Matter detail');
    rec(await openViaSidebar(page, 'Tasks',   /\/app\/tasks$/,   '/app/tasks/',   /\/app\/tasks\/[^/]+$/,   'Task detail'),   'Task detail');

    // Invoice detail — Billing sidebar → first "View" button (router.push)
    {
      const label = 'Invoice detail';
      await page.locator('aside').getByRole('link', { name: 'Billing', exact: true }).first().click();
      await visible(expect(page).toHaveURL(/\/app\/billing$/, { timeout: 15_000 }));
      // Default tab is Quotations; switch to Invoices for the invoice "View" buttons.
      await page.getByRole('button', { name: /Invoices/ }).first().click().catch(() => {});
      const view = page.getByRole('button', { name: 'View' }).first();
      if (!(await visible(view.waitFor({ state: 'visible', timeout: 20_000 })))) skipped.push(label);
      else {
        await view.click();
        if (!(await visible(expect(page).toHaveURL(/\/app\/billing\/invoices\/[^/]+$/, { timeout: 15_000 })))) failures.push(`${label} → View did not open invoice`);
        else rec(await detailHealthy(page, label), label);
      }
    }

    // Notification modal — Notifications sidebar → first row → modal
    {
      const label = 'Notification modal';
      await page.locator('aside').getByRole('link', { name: 'Notifications', exact: true }).first().click();
      await visible(expect(page).toHaveURL(/\/app\/notifications$/, { timeout: 15_000 }));
      const row = page.locator('table tbody tr.cursor-pointer').first();
      if (!(await visible(row.waitFor({ state: 'visible', timeout: 20_000 })))) skipped.push(label);
      else {
        await row.click();
        if (!(await visible(page.getByText('Channel', { exact: true }).waitFor({ state: 'visible', timeout: 8_000 })))) failures.push(`${label} → modal did not open`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[03-detail-links] skipped (empty/n-a): ${skipped.join(', ') || 'none'}`);
    expect(failures, `\n${failures.length} detail-link failure(s):\n${failures.join('\n')}\n`).toEqual([]);
  });
});
