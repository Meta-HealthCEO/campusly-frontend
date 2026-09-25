import { test, expect, type Page } from '@playwright/test';
import { STANDALONE_TEACHER_NAV } from '../src/lib/nav/teacher-nav';
import { issueVerifyLink, spendAIActions } from './support/db';
import { assertLocalUrl } from './support/local';
import { overflowsSideways, watchPage, type Allowed } from './support/watch';

const stamp = Date.now();
const teacher = { first: 'Launch', last: `Teacher${stamp}`, email: `test+launch-${stamp}@example.test`, password: 'Launch-check-2026' };
const learner = { first: 'Lerato', last: `Learner${stamp}`, email: `test+learner-${stamp}@example.test`, password: 'Learner1-check' };

async function expectNoSidewaysScroll(page: Page, where: string): Promise<void> {
  expect(await overflowsSideways(page), `${where} scrolls sideways at 375 px`).toBe(false);
}

test('a new standalone teacher can launch without a dead end', async ({ page, browser, baseURL }) => {
  // It signs people up: never against anything but this machine.
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');

  const allowed: Allowed[] = [];
  const problems = watchPage(page, () => allowed);

  await test.step('sign up with the real form', async () => {
    await page.goto('/signup/teacher');
    await page.getByLabel('First name').fill(teacher.first);
    await page.getByLabel('Last name').fill(teacher.last);
    await page.getByLabel('Email').fill(teacher.email);
    await page.getByLabel('Password', { exact: false }).first().fill(teacher.password);
    await page.getByLabel('Confirm password').fill(teacher.password);
    await expectNoSidewaysScroll(page, '/signup/teacher');
    await page.getByRole('button', { name: 'Create my classroom' }).click();
    await page.waitForURL('**/teacher/onboarding');
  });

  await test.step('onboarding 1: what you teach (Grade 4 Mathematics)', async () => {
    await expect(page.getByRole('heading', { name: 'What do you teach?' })).toBeVisible();
    await page.getByRole('tab', { name: /Intermediate/ }).click();
    await page.locator('label', { hasText: /^Grade 4$/ }).click();
    await page.getByRole('button', { name: /^Mathematics$/ }).first().click();
    await expectNoSidewaysScroll(page, 'onboarding step 1');
    await page.getByRole('button', { name: 'Save and continue' }).click();
  });

  let joinCode = '';
  await test.step('onboarding 2: first class and its join code', async () => {
    await expect(page.getByLabel('Class name')).toBeVisible();
    await expectNoSidewaysScroll(page, 'onboarding step 2');
    await page.getByRole('button', { name: 'Create class' }).click();
    await expect(page.getByText(/is ready$/)).toBeVisible();
    joinCode = (await page.locator('.font-mono.text-primary').first().innerText()).replace(/\s+/g, '');
    expect(joinCode).toMatch(/^[A-Z0-9]{4,}$/);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText(/Build my first lesson|Create a class for a subject/)).toBeVisible();
    await expectNoSidewaysScroll(page, 'onboarding step 3');
  });

  await test.step('verify email with a real link', async () => {
    await page.goto(await issueVerifyLink(teacher.email));
    await expect(page.getByText(/verified/i).first()).toBeVisible();
  });

  await test.step('a learner joins with the code (their own browser)', async () => {
    const learnerContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const learnerPage = await learnerContext.newPage();
    const learnerProblems = watchPage(learnerPage, () => []);
    await learnerPage.goto('/register-student');
    await learnerPage.getByLabel('First name').fill(learner.first);
    await learnerPage.getByLabel('Last name').fill(learner.last);
    await learnerPage.getByLabel('Email').fill(learner.email);
    await learnerPage.getByLabel('Password', { exact: false }).first().fill(learner.password);
    await learnerPage.getByLabel('Confirm password').fill(learner.password);
    await learnerPage.getByLabel(/Classroom code/i).fill(joinCode);
    await expectNoSidewaysScroll(learnerPage, '/register-student');
    await learnerPage.getByRole('button', { name: 'Join Classroom' }).click();
    await expect(learnerPage.getByText('Welcome! You have joined your classroom.')).toBeVisible();
    await learnerPage.waitForURL('**/student');
    await expect(learnerPage.getByRole('heading', { level: 1 }).first()).toBeVisible();
    expect(learnerProblems).toEqual([]);
    await learnerContext.close();

    await page.goto('/teacher/classes');
    await expect(page.getByRole('heading', { name: 'My classes', level: 1 })).toBeVisible();
    await expectNoSidewaysScroll(page, '/teacher/classes');
    await page.getByRole('cell', { name: 'Grade 4 Mathematics' }).first().click();
    await page.waitForURL('**/roster');
    await expect(page.getByText(`${learner.first} ${learner.last}`).first()).toBeVisible();
    await expectNoSidewaysScroll(page, 'class roster');
  });

  await test.step('build a lesson: the AI is not set up locally, so it says so plainly', async () => {
    allowed.push({ status: 503, path: /^\/api\// });
    await page.goto('/teacher/courses');
    await expect(page.getByRole('heading', { name: 'Lessons', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'New lesson with AI' }).first().click();
    await page.waitForURL('**/teacher/courses/new');
    await expect(page.getByText(/CAPS topics/).first()).toBeVisible();
    await expectNoSidewaysScroll(page, '/teacher/courses/new');
    await page.getByRole('combobox', { name: /Class/ }).click();
    await page.getByRole('option', { name: /Grade 4 Mathematics/ }).click();
    await page.getByRole('radio', { name: 'Term 1' }).click();
    await expect(page.getByRole('checkbox').first()).toBeVisible();
    await page.getByRole('button', { name: 'Draft the outline' }).click();
    await expect(page.getByText(/AI isn't set up/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open it' })).toBeVisible();
  });

  await test.step('set Exercise homework', async () => {
    await page.goto('/teacher/homework/new');
    await expect(page.getByRole('button', { name: /^Project/ })).toBeVisible();
    await page.getByRole('button', { name: /^Exercise/ }).click();
    const combos = page.getByRole('combobox');
    await combos.nth(0).click();
    await page.getByRole('option', { name: /Grade 4 Mathematics/ }).click();
    await combos.nth(1).click();
    await page.getByRole('option', { name: /Mathematics/ }).first().click();
    await page.getByRole('button', { name: /^Time CAPS-/ }).click();
    const due = new Date(Date.now() + 3 * 86400_000);
    const pad = (n: number): string => String(n).padStart(2, '0');
    await page.getByLabel(/Due/).fill(`${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}T17:00`);
    await page.getByLabel(/Total marks/i).fill('10');
    await expectNoSidewaysScroll(page, '/teacher/homework/new step 1');
    await page.getByRole('button', { name: 'Next: Choose Content' }).click();
    await expect(page.getByText('Step 2 of 3').first()).toBeVisible();
    await expectNoSidewaysScroll(page, '/teacher/homework/new step 2');
    // No saved questions for a new teacher's topic: the questions come from the AI.
    await page.getByRole('button', { name: 'Draft with AI' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Draft questions' }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: /AI isn't set up/ })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    // No AI needed: the teacher writes their own question.
    await page.getByRole('button', { name: 'Write a question' }).click();
    const write = page.getByRole('dialog');
    await write.getByRole('textbox', { name: /^Question/ }).fill('How many minutes are in one hour?');
    await write.getByLabel('Option A', { exact: true }).fill('30');
    await write.getByLabel('Option B', { exact: true }).fill('60');
    await write.getByLabel('Option C', { exact: true }).fill('100');
    await write.getByLabel('Option B is correct').check();
    await write.getByRole('button', { name: 'Save and add' }).click();
    await expect(write).toBeHidden();
    await expect(page.getByText('How many minutes are in one hour?')).toBeVisible();
    await page.getByRole('button', { name: 'Review' }).click();
    await page.getByRole('button', { name: /Assign Homework/ }).click();
    await page.waitForURL(/\/teacher\/homework\/[a-f0-9]{24}$/);
  });

  await test.step('a Project opens the brief + rubric flow', async () => {
    await page.goto('/teacher/homework/new');
    await page.getByRole('button', { name: /^Project/ }).click();
    await page.waitForURL('**/teacher/assignments/new');
    await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
    await expect(page.getByText('Project settings')).toBeVisible();
    await expectNoSidewaysScroll(page, '/teacher/assignments/new');
    await page.getByRole('tab', { name: 'Search' }).click();
    await page.getByRole('button', { name: /Search for a topic/ }).click();
    await page.getByPlaceholder('Search nodes...').fill('Time');
    await page.getByRole('button', { name: /^topic\s*Time$/ }).first().click();
    await page.getByPlaceholder(/Examples:/).fill('A one-week project: keep a time diary and work out how long each activity took.');
    await page.getByRole('button', { name: /Generate draft with AI/ }).click();
    await expect(page.getByText(/AI isn't set up/).first()).toBeVisible();

    // No AI needed: write the brief and rubric yourself.
    await page.getByRole('button', { name: 'Write it myself' }).click();
    await page.getByLabel('Title').fill('Time diary');
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type('Keep a time diary for a week and work out how long each activity took.');
    const criteria = page.getByPlaceholder('Criterion name');
    const count = await criteria.count();
    for (let i = 0; i < count; i += 1) await criteria.nth(i).fill(`Criterion ${i + 1}`);
    await expectNoSidewaysScroll(page, 'project written by hand');
    await page.getByRole('button', { name: 'Publishing options' }).click();
    await page.getByRole('button', { name: /Save & publish/ }).click();
    await page.waitForURL(/\/teacher\/assignments\/[a-f0-9]{24}$/);
    await expect(page.getByRole('heading', { name: 'Time diary' })).toBeVisible();

    await page.goto('/teacher/assignments');
    await page.waitForURL('**/teacher/homework');
    await expect(page.getByText('Time diary').first()).toBeVisible();
    await expect(page.getByText('Project').first()).toBeVisible();
  });

  await test.step('take the register (no timetable)', async () => {
    await page.goto('/teacher/attendance');
    await expect(page.getByRole('heading', { name: 'Register', level: 1 })).toBeVisible();
    await expect(page.getByText(`${learner.first} ${learner.last}`).first()).toBeVisible();
    await expectNoSidewaysScroll(page, '/teacher/attendance');
    await page.getByRole('button', { name: /Save Attendance/i }).click();
    await expect(page.getByText(/Attendance saved/)).toBeVisible();
  });

  await test.step('open the gradebook', async () => {
    await page.goto('/teacher/grades');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expectNoSidewaysScroll(page, '/teacher/grades');
  });

  await test.step('Billing shows the free allowance; used up, AI opens the upgrade prompt', async () => {
    await page.goto('/my/billing');
    await expect(page.getByText('20 of 20 AI actions left this month').first()).toBeVisible();
    await expect(page.getByText('What you get')).toBeVisible();
    await expectNoSidewaysScroll(page, '/my/billing');

    await spendAIActions(teacher.email, 20);
    allowed.push({ status: 402, path: /^\/api\// });
    await page.goto('/teacher/courses/new');
    // At 0 left the page says so instead of showing a form the server would refuse.
    await expect(page.getByText(/used this month's free AI actions/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Upgrade to Pro/ }).or(page.getByRole('button', { name: /Upgrade to Pro/ })).first()).toBeVisible();
  });

  await test.step('every page in the standalone nav works at 375 px', async () => {
    for (const item of STANDALONE_TEACHER_NAV) {
      await page.goto(item.href);
      await page.waitForLoadState('networkidle');
      expect(new URL(page.url()).pathname, `${item.label} stays on its page`).toBe(item.href);
      await expect(page.getByRole('heading', { level: 1 }).first(), `${item.label} has a title`).toBeVisible();
      await expectNoSidewaysScroll(page, item.href);
    }
  });

  expect(problems, 'console errors and failed API calls').toEqual([]);
});
