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

/** Form controls without a label and buttons/links without a name (spec §7). */
export async function unlabelledControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
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
        if (!visible(el)) return;
        const labels = (el as HTMLInputElement).labels;
        const labelled = (labels !== null && labels !== undefined && Array.from(labels).some((l: HTMLLabelElement) => text(l) !== ''))
          || ariaName(el) !== '' || text(el.closest('label')) !== '';
        if (!labelled) problems.push(`unlabelled ${describe(el)}`);
      });
    document.querySelectorAll('button, [role=button], a[href]').forEach((el: Element) => {
      if (!visible(el)) return;
      if (text(el) === '' && ariaName(el) === '' && !el.querySelector('img[alt]:not([alt=""])')) problems.push(`unnamed ${describe(el)}`);
    });
    return problems;
  });
}

/** Tabs through the first `max` stops; lists any that show neither an outline nor a ring. */
export async function focusRingMissing(page: Page, max = 8): Promise<string[]> {
  const missing: string[] = [];
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab');
    const result = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      // The Next.js dev-tools badge (dev server only, never shipped) is not part of the app.
      if (el.tagName.toLowerCase() === 'nextjs-portal') return '';
      const style = getComputedStyle(el);
      const outlined = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      const ringed = style.boxShadow !== '' && style.boxShadow !== 'none';
      return outlined || ringed ? '' : `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40)}"`;
    });
    if (result === null) break;
    if (result !== '') missing.push(result);
  }
  return missing;
}
