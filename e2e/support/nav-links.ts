import type { Locator, Page } from '@playwright/test';

/** The hrefs a person can follow inside `root`: visible links, not the group toggles and not the logo. */
async function visibleHrefs(root: Locator): Promise<string[]> {
  const hrefs = await root.locator('a[href]:not([aria-expanded]):not([aria-label="Campusly home"])').evaluateAll(
    (links: Element[]) => links
      .filter((a: Element) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((a: Element) => new URL((a as HTMLAnchorElement).href).pathname),
  );
  return [...new Set(hrefs)].sort();
}

/** Opens every collapsed group in `root` so its children are links on screen. */
async function expandGroups(root: Locator): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    const closed = root.locator('[aria-expanded="false"]').first();
    if ((await closed.count()) === 0) return;
    await closed.click();
  }
}

/** Desktop (1280): the full sidebar with every group open — the app's own gated nav for this person. */
export async function desktopNavLinks(page: Page): Promise<string[]> {
  const aside = page.locator('aside');
  await expandGroups(aside);
  return visibleHrefs(aside);
}

/** Tablet (800): the rail's "Open all pages" sheet with every group open. */
export async function tabletNavLinks(page: Page): Promise<string[]> {
  await page.getByRole('button', { name: 'Open all pages' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.waitFor();
  await expandGroups(sheet);
  const hrefs = await visibleHrefs(sheet);
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'hidden' });
  return hrefs;
}

export interface PhoneSheet { tab: string; hrefs: string[] }

/** Phone (320): the bottom tabs that link, plus the links in every sheet a tab opens. `onSheet` runs while each is open. */
export async function phoneNavLinks(page: Page, onSheet?: (tab: string) => Promise<void>): Promise<string[]> {
  const bar = page.getByRole('navigation', { name: 'Main' });
  const direct = await visibleHrefs(bar);
  const sheetTabs = await bar.locator('button[aria-haspopup="dialog"]').allInnerTexts();
  const all = new Set(direct);
  for (const tab of sheetTabs.map((t: string) => t.trim())) {
    await bar.getByRole('button', { name: tab, exact: true }).click();
    const sheet = page.getByRole('dialog');
    await sheet.waitFor();
    for (const href of await visibleHrefs(sheet)) all.add(href);
    if (onSheet) await onSheet(tab);
    await page.keyboard.press('Escape');
    await sheet.waitFor({ state: 'hidden' });
  }
  return [...all].sort();
}

/** Every link in a nav config, children included. */
export function configHrefs(items: ReadonlyArray<{ href: string; children?: ReadonlyArray<{ href: string }> }>): Set<string> {
  return new Set(items.flatMap((item) => [item.href, ...(item.children ?? []).map((c) => c.href)]));
}
