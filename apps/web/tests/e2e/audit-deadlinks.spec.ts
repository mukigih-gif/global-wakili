import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

/**
 * audit-deadlinks.spec.ts — GW-EOS v4.0 auditor (robust).
 *
 * Per route:
 *  1. NETWORK: capture every response with HTTP status >= 400 (exact URL +
 *     method + status) — powers the 4xx triage.
 *  2. LINKS: flag dead hrefs (#, empty, javascript:).
 *  3. BUTTONS (opt-in AUDIT_CLICK=1): click every NON-MUTATING button and flag
 *     no-reaction (no nav / modal / request / DOM change). ROBUST: per-button
 *     try/catch, 2.5s click cap, NO full-page reset, capped at 50 buttons/route,
 *     mutation denylist for prod-safety.
 *
 * Output: JSON to AUDIT_REPORT (default tests/e2e/audit-report.json).
 * Fails if dead links OR 4xx errors found (that's the point); always writes the
 * report. Scope with AUDIT_ROUTES="a,b,c".
 */

const EMAIL    = process.env.E2E_EMAIL    ?? 'admin@yourlawfirm.co.ke';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin@2026!';
const TENANT   = process.env.E2E_TENANT   ?? 'demo-law-firm';

const DEFAULT_ROUTES = [
  '/app/dashboard', '/app/dashboard/cfo', '/app/calendar', '/app/messaging', '/app/notifications',
  '/app/clients', '/app/matters', '/app/documents', '/app/tasks', '/app/workflows',
  '/app/approvals', '/app/court/filings', '/app/tenders',
  '/app/billing', '/app/finance', '/app/tax', '/app/trust',
  '/app/time-capture', '/app/procurement', '/app/vendors', '/app/reception', '/app/hr',
  '/app/analytics', '/app/reports', '/app/ai', '/app/resources', '/app/settings',
];
const ROUTES = process.env.AUDIT_ROUTES?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_ROUTES;

const MUTATION = /(delete|remove|save|submit|approve|reject|pay|create|record|withdraw|deposit|post|confirm|archive|restore|send|fiscalize|convert|void|issue|cancel|generate|assign|allocate|transfer|new |add |upload|sign|escalate|delegate|reassign|mark)/i;
const CLICK = process.env.AUDIT_CLICK === '1';

type Dead = { route: string; kind: 'link' | 'button'; label: string; reason: string };
type NetErr = { route: string; url: string; method: string; status: number };

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

test.describe('GW-EOS v4.0 auditor (links + network + optional buttons)', () => {
  test('audit routes', async ({ page }) => {
    test.setTimeout(900_000);
    await login(page);

    const dead: Dead[] = [];
    const netErrors: NetErr[] = [];
    const consoleErrors: { route: string; text: string }[] = [];
    let currentRoute = '';

    // Network capture — exact failing requests (status >= 400), API calls only.
    page.on('response', (res) => {
      const status = res.status();
      const url = res.url();
      if (status >= 400 && /\/api\/v1\//.test(url)) {
        netErrors.push({ route: currentRoute, url: url.replace('https://global-wakili-api.vercel.app', ''), method: res.request().method(), status });
      }
    });
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ route: currentRoute, text: m.text().slice(0, 200) }); });
    page.on('pageerror', (e) => consoleErrors.push({ route: currentRoute, text: 'PAGEERROR: ' + String(e).slice(0, 200) }));

    for (const route of ROUTES) {
      currentRoute = route;
      await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {});
      if (/\/login/.test(page.url())) { await login(page); await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {}); }
      await page.locator('aside').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      await page.mouse.move(970, 350);
      await page.waitForTimeout(2500); // let load-time API calls settle (captured above)

      // LINKS
      for (const link of await page.locator('main a[href]').all().catch(() => [])) {
        const href = (await link.getAttribute('href').catch(() => '')) || '';
        if (href === '#' || href === '' || href.startsWith('javascript:')) {
          const label = ((await link.innerText().catch(() => '')) || href).replace(/\s+/g, ' ').trim().slice(0, 60);
          dead.push({ route, kind: 'link', label, reason: `dead href="${href}"` });
        }
      }

      // BUTTONS (robust, opt-in)
      if (CLICK) {
        const buttons = await page.locator('main button').all().catch(() => []);
        const cap = Math.min(buttons.length, 50);
        for (let i = 0; i < cap; i++) {
          const btn = buttons[i];
          let label = '';
          try {
            label = ((await btn.innerText({ timeout: 1000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 60);
            if (!label || MUTATION.test(label)) continue;
            if (!(await btn.isVisible().catch(() => false)) || !(await btn.isEnabled().catch(() => false))) continue;

            const urlBefore = page.url();
            const htmlBefore = (await page.locator('main').innerHTML().catch(() => '')).length;
            let sawReq = false;
            const onReq = () => { sawReq = true; };
            page.on('request', onReq);
            await btn.click({ timeout: 2500 }).catch(() => {});
            await page.waitForTimeout(500);
            page.off('request', onReq);

            const modalOpen = await page.locator('[role="dialog"], .fixed.inset-0').first().isVisible().catch(() => false);
            const urlAfter = page.url();
            const htmlAfter = (await page.locator('main').innerHTML().catch(() => '')).length;
            const reacted = sawReq || urlAfter !== urlBefore || modalOpen || Math.abs(htmlAfter - htmlBefore) > 40;
            if (!reacted) dead.push({ route, kind: 'button', label, reason: 'no nav/modal/request/DOM change' });

            if (modalOpen) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(150); }
            if (urlAfter !== urlBefore) break; // navigated away — stop buttons for this route (no reset)
          } catch { /* per-button isolation: never let one button kill the route */ }
        }
      }
    }

    const report = { generatedAt: new Date().toISOString(), routesAudited: ROUTES.length, clickMode: CLICK, deadCount: dead.length, netErrorCount: netErrors.length, consoleErrorCount: consoleErrors.length, dead, netErrors, consoleErrors };
    fs.writeFileSync(process.env.AUDIT_REPORT ?? 'tests/e2e/audit-report.json', JSON.stringify(report, null, 2));
    // eslint-disable-next-line no-console
    console.log(`\n[AUDIT] routes=${ROUTES.length} clickMode=${CLICK} deadLinks/buttons=${dead.length} netErrors=${netErrors.length} consoleErrors=${consoleErrors.length}`);
    for (const n of netErrors) console.log(`  NET ${n.status} ${n.method} [${n.route}] ${n.url}`);
    for (const d of dead) console.log(`  DEAD [${d.kind}] ${d.route} → "${d.label}" (${d.reason})`);

    expect({ dead: dead.length, net: netErrors.length }, `dead=${dead.length} net4xx=${netErrors.length} (see report)`).toEqual({ dead: 0, net: 0 });
  });
});
