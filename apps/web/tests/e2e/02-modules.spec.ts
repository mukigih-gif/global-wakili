import { test, expect, Page } from '@playwright/test';

/**
 * 02-modules.spec.ts — Module & link runtime smoke (Phase 2).
 *
 * Logs in ONCE, then visits every module/landing route reachable from the
 * navigation (sidebar, command palette, settings hub, and each domain's
 * sub-pages) and asserts each renders healthy for an authenticated user:
 *   - not redirected back to /login (auth held + route exists)
 *   - authed shell present (<aside> sidebar rendered)
 *   - no 500 error boundary ("Something went wrong")
 *   - no 404 ("Page not found")
 *
 * Dynamic detail routes ([id]/[taskId]/[matterId]) are covered by domain
 * specs (they need real record IDs) and are intentionally excluded here.
 *
 * Failures are accumulated so ONE bad route doesn't hide the rest.
 */

const EMAIL    = process.env.E2E_EMAIL    ?? 'admin@yourlawfirm.co.ke';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin@2026!';
const TENANT   = process.env.E2E_TENANT   ?? 'demo-law-firm';

const ROUTES: string[] = [
  // Core
  '/app/dashboard', '/app/dashboard/cfo', '/app/calendar', '/app/messaging', '/app/notifications',
  // Legal practice
  '/app/clients', '/app/clients/prospects', '/app/clients/issues',
  '/app/matters', '/app/documents', '/app/tasks', '/app/workflows',
  '/app/approvals', '/app/court/filings', '/app/tenders',
  // Finance
  '/app/billing', '/app/billing/proformas', '/app/billing/retainers',
  '/app/billing/reminders', '/app/billing/notifications',
  '/app/finance', '/app/finance/periods', '/app/finance/reconciliation',
  '/app/tax',
  '/app/trust', '/app/trust/deposit', '/app/trust/withdraw', '/app/trust/transfer', '/app/trust/interest',
  // Operations
  '/app/time-capture', '/app/procurement', '/app/vendors',
  '/app/reception', '/app/reception/walk-ins',
  '/app/hr', '/app/hr/departments', '/app/hr/disciplinary', '/app/hr/onboarding',
  '/app/hr/performance', '/app/hr/payroll/batch',
  // Intelligence
  '/app/analytics', '/app/analytics/billing', '/app/analytics/clients',
  '/app/analytics/matter-profitability', '/app/analytics/payroll',
  '/app/analytics/tasks', '/app/analytics/time', '/app/analytics/trust',
  '/app/reports', '/app/ai',
  // Firm / settings
  '/app/resources', '/app/settings', '/app/settings/firm', '/app/settings/security',
  '/app/settings/users', '/app/settings/notifications', '/app/settings/integrations',
  '/app/settings/billing', '/app/settings/labels',
];

async function login(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('gw_cookie_consent', JSON.stringify({
        necessary: true, analytics: false, marketing: false, functional: false,
        timestamp: new Date().toISOString(), version: '1.0',
      }));
    } catch { /* ignore */ }
  });
  await page.goto('/login');
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder('your-firm-id').fill(TENANT);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 25_000 });
}

async function checkRoute(page: Page, route: string): Promise<string | null> {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  // authed shell (or error/login) settles — wait briefly for the sidebar.
  await page.locator('aside').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
  const url = page.url();
  if (/\/login/.test(url)) return `${route} → redirected to /login`;
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  if (body.includes('Something went wrong')) return `${route} → 500 error boundary`;
  if (body.includes('Page not found'))        return `${route} → 404 not found`;
  const shell = await page.locator('aside').first().isVisible().catch(() => false);
  if (!shell) return `${route} → authed shell (sidebar) did not render`;
  return null;
}

test.describe('Module & link smoke', () => {
  test('every module route loads for an authenticated user', async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);

    const failures: string[] = [];
    for (const route of ROUTES) {
      const err = await checkRoute(page, route);
      if (err) failures.push(err);
    }

    expect(failures, `\n${failures.length} route(s) failed:\n${failures.join('\n')}\n`).toEqual([]);
  });
});
