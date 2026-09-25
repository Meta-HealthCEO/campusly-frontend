import { expect, test, type Page } from '@playwright/test';
import { ADMIN_NAV, PARENT_NAV, STUDENT_NAV } from '../src/lib/constants';
import { STANDALONE_STUDENT_NAV } from '../src/lib/nav/student-nav';
import { assertLocalUrl } from './support/local';
import { brokenWords, focusRingMissing, sidewaysOverflow, unlabelledControls } from './support/a11y-audit';
import { configHrefs, desktopNavLinks, phoneNavLinks, tabletNavLinks } from './support/nav-links';
import { settle, signUpAsStandaloneLearner } from './support/session';

/**
 * Final review finding 8: the shell for the other roles. Signed in through the Development sign-in panel (never a
 * password), except a standalone teacher's learner, who signs up through the invite link with the test password
 * fixture (learner portal): every link in the role's nav is reachable on a phone (320px) and a tablet (800px), nothing
 * scrolls sideways, sheet labels never break mid-word, and the shell's controls are named and show focus.
 * Page content is audited too, but only reported (annotations) — this gate owns the shell.
 */
const SHELL = 'header, nav, aside, [role=dialog]';

const ROLES = [
  { role: 'school admin', account: /Lerato Nkosi/, home: '/admin', nav: ADMIN_NAV },
  { role: 'parent', account: /Pieter Botha/, home: '/parent', nav: PARENT_NAV },
  { role: 'learner', account: /Lebo Mthembu/, home: '/student', nav: STUDENT_NAV },
  { role: 'standalone learner', account: null, home: '/student', nav: STANDALONE_STUDENT_NAV },
] as const;

/** `account` null: a standalone teacher's learner, signed up through the dev standalone teacher's invite link. */
async function signIn(page: Page, account: RegExp | null, home: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  if (account) {
    await page.goto('/login');
    await page.locator('[aria-label="Development sign-in"]').getByRole('button', { name: account }).click();
  } else {
    await signUpAsStandaloneLearner(page);
  }
  await page.waitForURL((url: URL) => url.pathname === home || url.pathname.startsWith(`${home}/`));
  await settle(page);
}

async function auditHome(page: Page, role: string, width: number): Promise<void> {
  expect.soft(await sidewaysOverflow(page), `${role}: sideways at ${width}px`).toEqual([]);
  expect.soft(await unlabelledControls(page, SHELL), `${role}: shell labels at ${width}px`).toEqual([]);
  expect.soft(await focusRingMissing(page, 12, SHELL), `${role}: shell focus at ${width}px`).toEqual([]);
  const content = [...await unlabelledControls(page)].filter((p: string) => p.length > 0);
  if (content.length > 0) test.info().annotations.push({ type: 'page content (human pass)', description: `${role} @${width}: ${content.join(', ')}` });
}

for (const { role, account, home, nav } of ROLES) {
  test(`${role}: every nav link reachable at 320 and 800, shell clean`, async ({ page, baseURL }) => {
    assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
    await signIn(page, account, home);

    const expected = await desktopNavLinks(page);
    const config = configHrefs(nav);
    expect(expected.length, `${role}: the desktop nav shows links`).toBeGreaterThan(2);
    expect(expected.filter((h: string) => !config.has(h)), `${role}: desktop links come from the role's nav config`).toEqual([]);

    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto(home);
    await settle(page);
    await auditHome(page, role, 800);
    const tablet = await tabletNavLinks(page);
    expect.soft(expected.filter((h: string) => !tablet.includes(h)), `${role}: missing from the tablet All pages sheet`).toEqual([]);

    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(home);
    await settle(page);
    await auditHome(page, role, 320);
    const phone = await phoneNavLinks(page, async (tab: string) => {
      expect.soft(await sidewaysOverflow(page), `${role}: sideways with the ${tab} sheet open at 320px`).toEqual([]);
      expect.soft(await brokenWords(page, '[role=dialog] a span'), `${role}: ${tab} sheet labels break mid-word at 320px`).toEqual([]);
    });
    expect.soft(expected.filter((h: string) => !phone.includes(h)), `${role}: missing from the phone tabs and sheets`).toEqual([]);
    expect.soft(phone.filter((h: string) => !config.has(h)), `${role}: phone links come from the role's nav config`).toEqual([]);
    test.info().annotations.push({ type: 'nav', description: `${role}: desktop ${expected.length}, tablet ${tablet.length}, phone ${phone.length} links` });
  });
}
