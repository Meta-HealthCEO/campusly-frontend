import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end walkthroughs against the local dev servers (frontend :3500,
 * backend :4500, dev Mongo :27047). Start them first; see e2e/README.md.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 15 * 60_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list']],
  outputDir: './e2e/.results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3500',
    ...devices['Desktop Chrome'],
    // The launch check is mobile-first: every page must work at 375 px wide.
    viewport: { width: 375, height: 812 },
    navigationTimeout: 120_000,
    actionTimeout: 60_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
