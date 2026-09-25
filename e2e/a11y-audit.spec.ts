import { expect, test } from '@playwright/test';
import { unlabelledControls } from './support/a11y-audit';

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
