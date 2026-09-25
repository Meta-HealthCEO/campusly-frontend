//
// The learner half of the launch walkthrough (spec "Launch check"): at 375 px,
// a learner who joined through the invite link joins a second group, opens a
// lesson released before they joined, does homework, takes a test and sees
// their marks, with no console errors and no failed API calls.
// Hitting the tutor limit joins this journey with the learner AI limit (plan
// Task C9, after backend L-B): until then the tutor page is only opened.
import { expect, type Page } from '@playwright/test';
import { STANDALONE_STUDENT_NAV } from '../../src/lib/nav/student-nav';
import { addGroup, homeworkTitle, seedDigitalTest, seedReleasedUnit } from './db';
import { overflowsSideways, watchPage, type Allowed } from './watch';

export interface LearnerJourneyInput {
  teacherEmail: string;
  firstGroup: string;
}

async function noSideways(page: Page, where: string): Promise<void> {
  expect(await overflowsSideways(page), `${where} scrolls sideways at 375 px`).toBe(false);
}

/** `page` is the learner's own browser at 375 px, signed in through the invite link. */
export async function learnerJourney(page: Page, input: LearnerJourneyInput): Promise<void> {
  const extension = await addGroup(input.teacherEmail, 'Grade 4 Extension');
  const lesson = await seedReleasedUnit(input.teacherEmail, 'Grade 4 Extension'); // released before the learner joins it
  const test = await seedDigitalTest(input.teacherEmail, input.firstGroup);
  const homework = await homeworkTitle(input.teacherEmail);

  const allowed: Allowed[] = [];
  const problems = watchPage(page, () => allowed);

  for (const item of STANDALONE_STUDENT_NAV) {
    await page.goto(item.href);
    await page.waitForLoadState('networkidle');
    expect(new URL(page.url()).pathname, `${item.label} stays on its page`).toBe(item.href);
    await expect(page.getByRole('heading', { level: 1 }).first(), `${item.label} has a title`).toBeVisible();
    await noSideways(page, item.href);
  }
  await page.goto('/student/timetable');
  await page.waitForURL(/\/student$/);

  await page.goto('/student/profile');
  await page.getByLabel('Group code').fill(extension.code.toLowerCase());
  await page.getByRole('button', { name: 'Join group' }).click();
  await expect(page.getByText('You joined Grade 4 Extension.')).toBeVisible();
  await expect(page.getByText('Grade 4 Extension').first()).toBeVisible();

  await page.goto('/student/courses');
  await page.getByText(lesson).first().click();
  await page.waitForURL(/\/student\/courses\/[a-f0-9]{24}/);
  // The unit opens on its one item: the notes the teacher released before the learner joined.
  await expect(page.getByText('The short hand shows the hour').first()).toBeVisible();
  await noSideways(page, 'the lesson');

  // The project the teacher published sits in Homework too, and its Back returns there (spec §2).
  await page.goto('/student/homework');
  await page.getByRole('link', { name: /Time diary/ }).first().click();
  await page.waitForURL(/\/student\/assignments\/[a-f0-9]{24}$/);
  await expect(page.getByText('Time diary').first()).toBeVisible();
  await noSideways(page, 'the project');
  await page.getByRole('button', { name: 'Back to homework' }).click();
  await page.waitForURL(/\/student\/homework$/);

  await page.getByRole('link', { name: new RegExp(homework) }).first().click();
  await noSideways(page, 'the homework');
  await page.getByRole('radio', { name: /60$/ }).check();
  await page.getByRole('button', { name: /^Submit/ }).click();
  await expect(page.getByText(/Awarded: 1 \/ 1/).first()).toBeVisible();

  await page.goto('/student/tests');
  await page.getByText(test).first().click();
  const start = page.getByRole('button', { name: /^Start/ });
  if (await start.count()) await start.click();
  await noSideways(page, 'the test');
  await page.getByRole('textbox').first().fill('60');
  await page.getByRole('button', { name: 'Submit test' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText(/submitted/i).first()).toBeVisible();

  await page.goto('/student/grades');
  await expect(page.getByRole('heading', { name: 'Marks', level: 1 })).toBeVisible();
  await noSideways(page, '/student/grades');

  expect(problems, 'learner: console errors and failed API calls').toEqual([]);
}
