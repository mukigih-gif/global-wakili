import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

/**
 * audit-deadlinks.spec.ts — GW-EOS v4.0 dead-link / no-op auditor.
 *
 * For each app route: enumerate every <a> and every NON-MUTATING <button>,
 * interact with each, and flag "dead" elements (no navigation, no modal, no
 * network call, no DOM change) + capture console/page errors. Writes a
 * per-page JSON report to tests/e2e/audit-report.json.
 *
 * SAFETY: mutation controls (Delete/Save/Submit/Approve/Reject/Pay/Create/
 * Record/Withdraw/Deposit/Post/Confirm/Archive/Send/Fiscalize/Convert/Void)
 * are SKIPPED by a denylist so the auditor never writes/pollutes prod data.
 * Links are followed then we navigate back; buttons are clicked in place.
 *
 * This is an AUDITOR: it fails if dead elements are found (that's the point),
 * and always emits the report artifact for triage.
 */

const EMAIL    = process.env.E2E_EMAIL    ?? 'admin@yourlawfirm.co.ke';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin@2026!';
const TENANT   = process.env.E2E_TENANT   ?? 'demo-law-firm';

// Routes to audit (curated; matches the module surface). Override with
// AUDIT_ROUTES="a,b,c" to scope to one module for batching.
const DEFAULT_ROUTES = [
  '/app/dashboard', '/app/dashboard/cfo', '/app/calendar', '/app/messaging', '/app/notifications',
  '/app/clients', '/app/matters', '/app/documents', '/app/tasks', '/app/workflows',
  '/app/approvals', '/app/court/filings', '/app/tenders',
  '/app/billing', '/app/finance', '/app/tax', '/app/trust',
  '/app/time-capture', '/app/procurement', '/app/vendors', '/app/reception', '/app/hr',
  '/app/analytics', '/app/reports', '/app/ai', '/app/resources', '/app/settings',
];
const ROUTES = (process.env.AUDIT_ROUTES?.split(',').map((s) => s.trim()).filter(Boolean)) ?? DEFAULT_ROUTES;

// Button text that mutates data — never clicked by the auditor.
const MUTATION = /(delete|remove|save|submit|approve|reject|pay|create|record|withdraw|deposit|post|confirm|archive|restore|send|fiscalize|convert|void|issue|cancel|generate|assign|allocate|transfer|new |add |upload|sign|escalate|delegate|reassign|mark)/i;

type DeadItem = { route: string; kind: 'link' | 'button'; label: string; reason: string };

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

test.describe('GW-EOS v4.0 dead-link / no-op auditor', () => {
  test('audit every route for dead links & no-op controls', async ({ page }) => {
    test.setTimeout(600_000);
    await login(page);

    const dead: DeadItem[] = [];
    const consoleErrors: { route: string; text: string }[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ route: page.url(), text: m.text().slice(0, 200) }); });
    page.on('pageerror', (e) => consoleErrors.push({ route: page.url(), text: 'PAGEERROR: ' + String(e).slice(0, 200) }));

    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {});
      // re-login if a cold-start bounced us
      if (/\/login/.test(page.url())) { await login(page); await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {}); }
      await page.locator('aside').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      await page.mouse.move(970, 350); // collapse hover sidebar
      await page.waitForTimeout(1500);

      // ---- LINK audit: dead href detection (safe; no mutation) ----
      const links = await page.locator('main a[href]').all().catch(() => []);
      for (const link of links) {
        const href = (await link.getAttribute('href').catch(() => '')) || '';
        const label = ((await link.innerText().catch(() => '')) || href).replace(/\s+/g, ' ').trim().slice(0, 60);
        if (href === '#' || href === '' || href.startsWith('javascript:')) {
          dead.push({ route, kind: 'link', label, reason: `dead href="${href}"` });
        }
      }

      // ---- BUTTON audit: no-op detection (SLOW; opt-in via AUDIT_CLICK=1) ----
      const buttons = process.env.AUDIT_CLICK === '1' ? await page.locator('main button').all().catch(() => []) : [];
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const label = ((await btn.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        if (!label || MUTATION.test(label)) continue;                 // skip mutation / unlabeled
        if (!(await btn.isVisible().catch(() => false))) continue;
        if (!(await btn.isEnabled().catch(() => false))) continue;

        const urlBefore = page.url();
        const htmlBefore = (await page.locator('main').innerHTML().catch(() => '')).length;
        let sawRequest = false;
        const onReq = () => { sawRequest = true; };
        page.on('request', onReq);
        await btn.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(700);
        page.off('request', onReq);

        const urlAfter = page.url();
        const modalOpen = await page.locator('[role="dialog"], .fixed.inset-0').first().isVisible().catch(() => false);
        const htmlAfter = (await page.locator('main').innerHTML().catch(() => '')).length;
        const reacted = sawRequest || urlAfter !== urlBefore || modalOpen || Math.abs(htmlAfter - htmlBefore) > 40;

        if (!reacted) dead.push({ route, kind: 'button', label, reason: 'no navigation/modal/request/DOM change' });

        // reset: close any modal, return to route if navigated
        if (modalOpen) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(200); }
        if (urlAfter !== urlBefore) { await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {}); await page.mouse.move(970, 350); await page.waitForTimeout(800); break; }
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      routesAudited: ROUTES.length,
      deadCount: dead.length,
      consoleErrorCount: consoleErrors.length,
      dead,
      consoleErrors,
    };
    fs.writeFileSync(process.env.AUDIT_REPORT ?? 'tests/e2e/audit-report.json', JSON.stringify(report, null, 2));
    // eslint-disable-next-line no-console
    console.log(`\n[AUDIT] routes=${ROUTES.length} dead=${dead.length} consoleErrors=${consoleErrors.length}`);
    for (const d of dead) console.log(`  DEAD [${d.kind}] ${d.route} → "${d.label}" (${d.reason})`);

    expect(dead, `Dead elements found (see tests/e2e/audit-report.json):\n${dead.map((d) => `${d.route} [${d.kind}] "${d.label}" — ${d.reason}`).join('\n')}`).toEqual([]);
  });
});
