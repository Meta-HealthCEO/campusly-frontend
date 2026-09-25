import type { Page } from '@playwright/test';

export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

/** The dev sign-in panel's standalone teacher (Lindiwe Dube); no password is typed. */
export async function signInAsStandaloneTeacher(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('[aria-label="Development sign-in"]').getByRole('button', { name: /Standalone teacher/ }).click();
  await page.waitForURL(/\/teacher(\/|$)/);
}

/** The dev sign-in panel's school learner (Lebo Mthembu); no password is typed. */
export async function signInAsSchoolLearner(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('[aria-label="Development sign-in"]').getByRole('button', { name: /Lebo Mthembu/ }).click();
  await page.waitForURL(/\/student(\/|$)/);
}
