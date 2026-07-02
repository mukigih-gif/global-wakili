import { test, expect, Page } from '@playwright/test';

/**
 * 07-billing.spec.ts — Billing sub-domains (Phase 2, FRONT-003 surfaces).
 *
 * One authenticated session visits each billing sub-page (proformas, retainers,
 * payment reminders, notifications) via SPA navigation and asserts each renders
 * healthy (authed shell, heading, no 500/404). Read-only.
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

const SUBPAGES: { link: string; url: RegExp; label: string }[] = [
  { link: 'Proformas',         url: /\/app\/billing\/proformas$/,     label: 'Proformas' },
  { link: 'Retainers',         url: /\/app\/billing\/retainers$/,     label: 'Retainers' },
  { link: 'Payment Reminders', url: /\/app\/billing\/reminders$/,     label: 'Payment Reminders' },
  { link: 'Notifications',     url: /\/app\/billing\/notifications$/,  label: 'Billing Notifications' },
];

test.describe('Billing sub-domains', () => {
  test('every billing sub-page loads for an authenticated user', async ({ page }) => {
    test.setTimeout(150_000);
    await login(page);

    const failures: string[] = [];
    for (const sp of SUBPAGES) {
      // Return to the billing hub each time (sub-nav links live there).
      await page.locator('aside').getByRole('link', { name: 'Billing', exact: true }).click();
      await expect(page).toHaveURL(/\/app\/billing$/, { timeout: 15_000 });
      // Scope to main so the sub-nav "Notifications" doesn't collide with the sidebar one.
      await page.locator('main').getByRole('link', { name: sp.link }).first().click();
      try {
        await expect(page).toHaveURL(sp.url, { timeout: 15_000 });
      } catch { failures.push(`${sp.label} → did not navigate (${sp.url})`); continue; }
      const body = (await page.locator('body').innerText().catch(() => '')) || '';
      if (body.includes('Something went wrong')) failures.push(`${sp.label} → 500 error boundary`);
      else if (body.includes('Page not found')) failures.push(`${sp.label} → 404 not found`);
      else if (!(await page.locator('aside').first().isVisible().catch(() => false))) failures.push(`${sp.label} → shell missing`);
      else if (!(await page.locator('h1').first().isVisible().catch(() => false))) failures.push(`${sp.label} → no heading`);
    }

    expect(failures, `\n${failures.length} billing sub-page failure(s):\n${failures.join('\n')}\n`).toEqual([]);
  });
});
