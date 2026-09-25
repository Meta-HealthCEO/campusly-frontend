import type { Page } from '@playwright/test';
import { devStandaloneClassCode } from './db';

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

/** A fresh learner in the dev standalone teacher's group, signed up through the real invite link (test password fixture). */
export async function signUpAsStandaloneLearner(page: Page): Promise<void> {
  const code = await devStandaloneClassCode();
  const stamp = Date.now();
  await page.goto(`/register-student?code=${code.toLowerCase()}`);
  await page.getByLabel('First name').fill('Gate');
  await page.getByLabel('Last name').fill(`Learner${stamp}`);
  await page.getByLabel('Email').fill(`test+gate-learner-${stamp}@example.test`);
  await page.getByLabel('Password', { exact: false }).first().fill('Learner1-check');
  await page.getByLabel('Confirm password').fill('Learner1-check');
  await page.getByRole('button', { name: 'Join Classroom' }).click();
  await page.waitForURL(/\/student$/);
}
