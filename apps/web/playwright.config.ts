import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration — Global Wakili Legal Enterprise (Phase 2).
 *
 * Target: the deployed Next.js frontend on Vercel (global-wakili-api.vercel.app),
 * which talks to the Render-hosted API against the ep-withered-haze Neon branch.
 *
 * Run: npx playwright test            (headless, from apps/web)
 *      npx playwright test --headed   (watch the browser)
 *      npx playwright show-report      (open last HTML report)
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'https://global-wakili-api.vercel.app',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
