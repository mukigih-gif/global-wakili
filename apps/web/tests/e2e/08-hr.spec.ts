import { test, expect, Page } from '@playwright/test';

/**
 * 08-hr.spec.ts — HR module + every HR sub-module (Phase 2).
 *
 * Explicitly exercises each HR surface via SPA navigation from the HR hub:
 *   - Employee Onboarding  (/app/hr/onboarding)
 *   - Batch Payroll        (/app/hr/payroll/batch)
 *   - Performance Reviews  (/app/hr/performance)
 *   - Disciplinary Cases   (/app/hr/disciplinary)
 *   - Departments          (/app/hr/departments)
 * Each must render healthy (authed shell + heading, no 500/404). Read-only.
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

const SUBMODULES: { link: string; url: RegExp; label: string }[] = [
  { link: 'Employee Onboarding', url: /\/app\/hr\/onboarding$/,    label: 'HR — Onboarding' },
  { link: 'Batch Payroll',       url: /\/app\/hr\/payroll\/batch$/, label: 'HR — Batch Payroll' },
  { link: 'Performance Reviews', url: /\/app\/hr\/performance$/,    label: 'HR — Performance' },
  { link: 'Disciplinary Cases',  url: /\/app\/hr\/disciplinary$/,   label: 'HR — Disciplinary' },
  { link: 'Departments',         url: /\/app\/hr\/departments$/,    label: 'HR — Departments' },
];

async function gotoHrHub(page: Page) {
  await page.locator('aside').getByRole('link', { name: 'HR & Payroll', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/hr$/, { timeout: 15_000 });
  // Move the cursor off the sidebar so the hover-overlay collapses (otherwise the
  // expanded rail overlays the top-left quick-action cards) — mirrors a real user
  // whose cursor leaves the sidebar as it moves toward the content.
  await page.mouse.move(960, 320);
  await expect(page.locator('aside')).toHaveCSS('width', '64px', { timeout: 5_000 });
}

test.describe('HR module', () => {
  test('HR hub loads', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await gotoHrHub(page);
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    expect(body).not.toContain('Something went wrong');
    expect(body).not.toContain('Page not found');
  });

  test('every HR sub-module loads', async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);

    const failures: string[] = [];
    for (const sm of SUBMODULES) {
      await gotoHrHub(page);
      await page.locator('main').getByRole('link', { name: sm.link }).first().click();
      try {
        await expect(page).toHaveURL(sm.url, { timeout: 15_000 });
      } catch { failures.push(`${sm.label} → did not navigate (${sm.url})`); continue; }
      const body = (await page.locator('body').innerText().catch(() => '')) || '';
      if (body.includes('Something went wrong')) failures.push(`${sm.label} → 500 error boundary`);
      else if (body.includes('Page not found')) failures.push(`${sm.label} → 404 not found`);
      else if (!(await page.locator('aside').first().isVisible().catch(() => false))) failures.push(`${sm.label} → shell missing`);
      else if (!(await page.locator('h1').first().isVisible().catch(() => false))) failures.push(`${sm.label} → no heading`);
    }

    expect(failures, `\n${failures.length} HR sub-module failure(s):\n${failures.join('\n')}\n`).toEqual([]);
  });
});
