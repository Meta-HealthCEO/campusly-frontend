import { expect, test } from '@playwright/test';
import { brokenWords, focusRingMissing, unlabelledControls } from './support/a11y-audit';

/**
 * Orchestrator ruling O3: base-ui's Select renders a hidden form input (aria-hidden="true", tabindex="-1") that no
 * user can reach; the audit must skip it and still catch a real unlabelled control. Static markup, no server.
 */
test('unlabelledControls skips hidden form inputs but still catches a real unlabelled control', async ({ page }) => {
  await page.setContent(`
    <label for="named">Name</label><input id="named">
    <input id="bare">
    <input id="base-ui-hidden-input" aria-hidden="true" tabindex="-1"
      style="position:absolute;width:1px;height:1px;clip-path:inset(50%)">
    <input id="hidden-but-focusable" aria-hidden="true">
    <button id="icon-only"><svg width="16" height="16"></svg></button>
    <button aria-label="Close"><svg width="16" height="16"></svg></button>
  `);
  expect(await unlabelledControls(page)).toEqual([
    'unlabelled input#bare',
    'unlabelled input#hidden-but-focusable',
    'unnamed button#icon-only',
  ]);
});

/** ARIA names radio, checkbox, switch and combobox-free button roles from their text; an empty one is still caught. */
test('unlabelledControls names a radio or switch role from its text, and catches an empty one', async ({ page }) => {
  await page.setContent(`
    <div role="radiogroup" aria-label="Term"><button id="t1" role="radio" aria-checked="true">Term 1</button></div>
    <span id="empty-switch" role="switch" aria-checked="false" tabindex="0" style="display:inline-block;width:40px;height:24px"></span>
    <span id="named-switch" role="switch" aria-checked="false" tabindex="0" aria-label="Bill annually" style="display:inline-block;width:40px;height:24px"></span>
  `);
  expect(await unlabelledControls(page)).toEqual(['unlabelled span#empty-switch']);
});

/** Final review 8: the role gate audits the shell only (header, nav, aside, open sheets); page content is reported. */
test('unlabelledControls and focusRingMissing can be scoped to the shell', async ({ page }) => {
  await page.setContent(`
    <header><button id="shell-icon"><svg width="16" height="16"></svg></button></header>
    <main><input id="content-bare"><button id="content-plain" style="outline:none">Go</button></main>
  `);
  expect(await unlabelledControls(page, 'header, nav, aside, [role=dialog]')).toEqual(['unnamed button#shell-icon']);
  expect(await unlabelledControls(page)).toEqual(['unlabelled input#content-bare', 'unnamed button#shell-icon']);
  expect(await focusRingMissing(page, 5, 'main')).toEqual(['button "Go"']);
});

test('brokenWords finds a label whose word is split across lines, and passes whole words', async ({ page }) => {
  await page.setContent(`
    <a class="lbl" id="broken" style="display:block;width:40px;word-break:break-all;font:12px sans-serif">Communication</a>
    <a class="lbl" id="whole" style="display:block;width:200px;font:12px sans-serif">Announcements and news</a>
  `);
  expect(await brokenWords(page, '.lbl')).toEqual(['Communication']);
});
