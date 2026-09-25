import type { Page } from '@playwright/test';

/**
 * Where the page is wider than the viewport. `<main>` is the dashboard's own scroll box (ruling R23),
 * so it is checked as well as the document; tables scroll inside `[data-scroll-x]` and are allowed to.
 */
export async function sidewaysOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) found.push(`document ${doc.scrollWidth}px`);
    const main = document.querySelector('main');
    if (main && main.scrollWidth > main.clientWidth + 1) found.push(`main ${main.scrollWidth}px in ${main.clientWidth}px`);
    return found;
  });
}

/**
 * Form controls without a label and buttons/links without a name (spec §7). With `scope` (a selector list), only
 * elements inside it count — the role gate audits the shell (final review 8).
 */
export async function unlabelledControls(page: Page, scope?: string): Promise<string[]> {
  return page.evaluate((scopeSel: string | null) => {
    const inScope = (el: Element): boolean => !scopeSel || el.closest(scopeSel) !== null;
    const visible = (el: Element): boolean => {
      const box = (el as HTMLElement).getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const labelledBy = (el: Element): string => (el.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/).filter(Boolean).map((id: string) => text(document.getElementById(id))).join(' ').trim();
    const ariaName = (el: Element): string => (el.getAttribute('aria-label') ?? '').trim() || labelledBy(el) || (el.getAttribute('title') ?? '').trim();
    const describe = (el: Element): string => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.getAttribute('name') ? `[name=${el.getAttribute('name')}]` : ''}`;
    const problems: string[] = [];
    document.querySelectorAll('input:not([type=hidden]), select, textarea, [role=combobox], [role=switch], [role=checkbox], [role=radio], [role=slider]')
      .forEach((el: Element) => {
        if (!visible(el) || !inScope(el)) return;
        // Ruling O3: hidden from assistive tech AND out of the tab order is not a user control (base-ui Select's form input).
        if (el.getAttribute('aria-hidden') === 'true' && el.getAttribute('tabindex') === '-1') return;
        const labels = (el as HTMLInputElement).labels;
        // ARIA takes a radio, checkbox or switch role's name from its text (a <button role="radio">Term 1</button>).
        const nameFromContent = /^(radio|checkbox|switch)$/.test(el.getAttribute('role') ?? '') && text(el) !== '';
        const labelled = (labels !== null && labels !== undefined && Array.from(labels).some((l: HTMLLabelElement) => text(l) !== ''))
          || ariaName(el) !== '' || text(el.closest('label')) !== '' || nameFromContent;
        if (!labelled) problems.push(`unlabelled ${describe(el)}`);
      });
    document.querySelectorAll('button, [role=button], a[href]').forEach((el: Element) => {
      if (!visible(el) || !inScope(el)) return;
      if (text(el) === '' && ariaName(el) === '' && !el.querySelector('img[alt]:not([alt=""])')) problems.push(`unnamed ${describe(el)}`);
    });
    return problems;
  }, scope ?? null);
}

/** Tabs through the first `max` stops; lists any that show neither an outline nor a ring (only inside `scope`, if given). */
export async function focusRingMissing(page: Page, max = 8, scope?: string): Promise<string[]> {
  const missing: string[] = [];
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab');
    const result = await page.evaluate((scopeSel: string | null) => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      if (scopeSel && !el.closest(scopeSel)) return '';
      // The Next.js dev-tools badge (dev server only, never shipped) is not part of the app.
      if (el.tagName.toLowerCase() === 'nextjs-portal') return '';
      const style = getComputedStyle(el);
      const outlined = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      const ringed = style.boxShadow !== '' && style.boxShadow !== 'none';
      return outlined || ringed ? '' : `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40)}"`;
    }, scope ?? null);
    if (result === null) break;
    if (result !== '') missing.push(result);
  }
  return missing;
}

/** Labels (matched by `selector`) with a word split across two lines — "Communi-/cation" (final review 4). */
export async function brokenWords(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((sel: string) => {
    const broken: string[] = [];
    document.querySelectorAll(sel).forEach((el: Element) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent ?? '';
        for (const m of text.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, m.index ?? 0);
          range.setEnd(node, (m.index ?? 0) + m[0].length);
          const lines = new Set(Array.from(range.getClientRects()).map((r: DOMRect) => Math.round(r.top)));
          if (lines.size > 1) {
            broken.push((el.textContent ?? '').trim());
            return;
          }
        }
      }
    });
    return broken;
  }, selector);
}
