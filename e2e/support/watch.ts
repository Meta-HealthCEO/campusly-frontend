import type { Page, Response } from '@playwright/test';

export interface Problem { kind: 'console' | 'api' | 'pageerror'; text: string; }

/** API failures the walkthrough expects: AI isn't configured locally, and the allowance runs out on purpose. */
export interface Allowed { status: number; path: RegExp; }

/** Collects console errors, uncaught page errors and failed /api calls for a page. */
export function watchPage(page: Page, allowed: () => Allowed[]): Problem[] {
  const problems: Problem[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // The browser's own "Failed to load resource" line (and a hook logging it) for an expected failure.
    const text = msg.text();
    if (allowed().some((a) => text.includes(`status of ${a.status}`) || text.includes(`status code ${a.status}`))) return;
    problems.push({ kind: 'console', text: `${page.url()} :: ${text.split('\n')[0]}` });
  });
  page.on('pageerror', (err) => problems.push({ kind: 'pageerror', text: `${page.url()} :: ${err.message}` }));
  page.on('response', (res: Response) => {
    const url = new URL(res.url());
    if (!url.pathname.startsWith('/api/') || res.status() < 400) return;
    if (allowed().some((a) => a.status === res.status() && a.path.test(url.pathname))) return;
    problems.push({ kind: 'api', text: `${res.request().method()} ${url.pathname} → ${res.status()} (on ${page.url()})` });
  });
  return problems;
}

/** True when the page scrolls sideways (something is wider than the viewport). */
export async function overflowsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}
