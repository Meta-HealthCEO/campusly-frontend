import { test, expect, type Page, type Request } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertLocalUrl } from './support/local';
import { DETAIL_ROUTES, POLLING, PUBLIC_ROUTES, TEACHER_ROUTES, WIDTHS } from './support/design-routes';
import { diffRequestSets, landedElsewhere, toRequestSet, withoutPolling } from './support/request-set';
import { focusRingMissing, sidewaysOverflow, unlabelledControls } from './support/a11y-audit';
import { settle, signInAsStandaloneTeacher } from './support/session';

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

test('public and auth pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  for (const route of PUBLIC_ROUTES) await test.step(route, () => sweep(page, route, route));
});

test('standalone teacher pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  await signInAsStandaloneTeacher(page);
  for (const route of TEACHER_ROUTES) await test.step(route, () => sweep(page, route, route));
  for (const detail of DETAIL_ROUTES) {
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
});

test.afterAll(() => {
  if (!RECORD) return;
  mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
  const merged = { ...baseline, ...recorded };
  writeFileSync(BASELINE_FILE, `${JSON.stringify(Object.fromEntries(Object.entries(merged).sort()), null, 2)}\n`);
});
