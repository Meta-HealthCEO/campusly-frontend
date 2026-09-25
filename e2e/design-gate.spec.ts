import { test, expect, type Page, type Request } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertLocalUrl } from './support/local';
import {
  DETAIL_ROUTES, LEARNER_DETAIL_ROUTES, LEARNER_ROUTES, POLLING, PUBLIC_ROUTES, SCHOOL_LEARNER_ROUTES, TEACHER_ROUTES, WIDTHS,
  type DetailRoute,
} from './support/design-routes';
import { diffRequestSets, landedElsewhere, toRequestSet, withoutPolling } from './support/request-set';
import { focusRingMissing, sidewaysOverflow, unlabelledControls } from './support/a11y-audit';
import { settle, signInAsSchoolLearner, signInAsStandaloneTeacher, signUpAsStandaloneLearner } from './support/session';

/**
 * Phase D machine gate, browser half (spec §7): no sideways scroll at six widths, labelled controls,
 * named buttons, visible focus, and each page's API calls unchanged from the baseline recorded on the
 * untouched code. E2E_RECORD_BASELINE=1 records the baseline instead of comparing.
 */
const BASELINE_FILE = path.join(__dirname, 'baselines', 'request-sets.json');
const RECORD = process.env.E2E_RECORD_BASELINE === '1';
const recorded: Record<string, string[]> = {};
const baseline: Record<string, string[]> = !RECORD && existsSync(BASELINE_FILE)
  ? (JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Record<string, string[]>)
  : {};

// Default mode, not serial: a soft failure on the public pages must not skip the teacher pages.
test.describe.configure({ mode: 'default' });

async function sweep(page: Page, route: string, key: string): Promise<void> {
  const calls: Array<{ method: string; url: string }> = [];
  const onRequest = (req: Request) => calls.push({ method: req.method(), url: req.url() });
  page.on('request', onRequest);
  const response = await page.goto(route);
  await settle(page);
  page.off('request', onRequest);
  if (response?.status() === 404) {
    test.info().annotations.push({ type: 'skipped', description: `${route}: 404` });
    return;
  }
  const set = withoutPolling(toRequestSet(calls), POLLING);
  // A page that redirects (e.g. /teacher/assignments → /teacher/homework for a standalone teacher) has no set of its
  // own: it depends on how far the redirect got before the network settled. Its destination is swept separately.
  const redirected = landedElsewhere(route, page.url());
  if (redirected) test.info().annotations.push({ type: 'redirected', description: `${route} → ${new URL(page.url()).pathname}: request set not compared` });
  if (RECORD) {
    if (!redirected) recorded[key] = set;
    return;
  }
  // The baseline is filtered the same way, so a key added to POLLING after recording never reads as "removed".
  if (baseline[key] && !redirected) expect.soft(diffRequestSets(withoutPolling(baseline[key], POLLING), set), `${key}: request set`).toEqual({ added: [], removed: [] });
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await settle(page);
    expect.soft(await sidewaysOverflow(page), `${key}: sideways at ${width}px`).toEqual([]);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  expect.soft(await unlabelledControls(page), `${key}: labels and names`).toEqual([]);
  expect.soft(await focusRingMissing(page), `${key}: focus ring`).toEqual([]);
}

/** Pages with an id: each found from the first matching link on its list page (ruling R15). */
async function sweepDetails(page: Page, details: readonly DetailRoute[]): Promise<void> {
  for (const detail of details) {
    await test.step(`detail: ${detail.name}`, async () => {
      await page.goto(detail.list);
      await settle(page);
      const hrefs = await page.locator('a[href]').evaluateAll((links: Element[]) => links.map((a: Element) => a.getAttribute('href') ?? ''));
      const href = hrefs.find((h: string) => detail.link.test(h));
      if (!href) {
        test.info().annotations.push({ type: 'skipped', description: `${detail.name}: no link on ${detail.list}` });
        return;
      }
      await sweep(page, href, `detail:${detail.name}`);
    });
  }
}

test('public and auth pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  for (const route of PUBLIC_ROUTES) await test.step(route, () => sweep(page, route, route));
});

test('standalone teacher pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  await signInAsStandaloneTeacher(page);
  for (const route of TEACHER_ROUTES) await test.step(route, () => sweep(page, route, route));
  await sweepDetails(page, DETAIL_ROUTES);
});

test('standalone learner pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  await signUpAsStandaloneLearner(page);
  for (const route of LEARNER_ROUTES) await test.step(route, () => sweep(page, route, `learner:${route}`));
  await sweepDetails(page, LEARNER_DETAIL_ROUTES);
});

test('password forms wait for JavaScript (learner portal spec §3)', async ({ browser, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const route of ['/login', '/register-student', '/signup/teacher', '/signup/coach', '/register']) {
    await page.goto(route);
    await expect(page.locator('form').first(), route).toHaveAttribute('method', 'post');
    await expect(page.locator('button[type="submit"]').first(), route).toBeDisabled();
  }
  await context.close();
});

test('school learner pages: unchanged by the learner portal', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  await signInAsSchoolLearner(page);
  for (const route of SCHOOL_LEARNER_ROUTES) await test.step(route, () => sweep(page, route, `school-learner:${route}`));
});

test.afterAll(() => {
  if (!RECORD) return;
  mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
  // Recording one test (-g) must not drop the other tests' baselines: merge into what is on disk.
  const onDisk = existsSync(BASELINE_FILE) ? (JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Record<string, string[]>) : {};
  const merged = { ...onDisk, ...recorded };
  writeFileSync(BASELINE_FILE, `${JSON.stringify(Object.fromEntries(Object.entries(merged).sort()), null, 2)}\n`);
});
