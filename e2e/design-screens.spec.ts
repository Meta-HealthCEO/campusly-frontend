import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { assertLocalUrl } from './support/local';
import { PUBLIC_ROUTES, TEACHER_ROUTES } from './support/design-routes';
import { settle, signInAsStandaloneTeacher } from './support/session';

/** Spec §7 evidence: one screenshot per in-scope page at 1280 (light) and 375 (dark). E2E_SCREENS=1 to run. */
const OUT = path.join(__dirname, '.screens');
const slug = (route: string) => (route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^\w]+/g, '-'));

test.skip(process.env.E2E_SCREENS !== '1', 'Screenshots run only with E2E_SCREENS=1');

async function shoot(page: Page, route: string): Promise<void> {
  for (const [width, height, scheme] of [[1280, 800, 'light'], [375, 812, 'dark']] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width, height });
    const response = await page.goto(route);
    if (response?.status() === 404) return;
    await settle(page);
    await page.screenshot({ path: path.join(OUT, `${slug(route)}-${width}-${scheme}.png`), fullPage: true });
  }
}

test('public and auth pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  mkdirSync(OUT, { recursive: true });
  for (const route of PUBLIC_ROUTES) await shoot(page, route);
});

test('standalone teacher pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  mkdirSync(OUT, { recursive: true });
  await signInAsStandaloneTeacher(page);
  for (const route of TEACHER_ROUTES) await shoot(page, route);
});
