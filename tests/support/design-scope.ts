import { existsSync } from 'node:fs';
import path from 'node:path';
import { STANDALONE_TEACHER_PREFIXES } from '../../src/lib/standalone-teacher-paths';
import { STANDALONE_STUDENT_PAGES } from '../../src/lib/standalone-student-paths';
import { ROOT, listSourceFiles } from './source';

export type DesignArea = 'landing+auth' | 'shell' | 'teacher pages' | 'learner pages';

const app = (p: string) => `src/app/${p}`;

/** Every page file under the prefixes a standalone teacher may open (ruling R2). */
function teacherEntries(): string[] {
  const dirs = STANDALONE_TEACHER_PREFIXES.map((p: string) => `src/app/(dashboard)${p}`)
    .filter((d: string) => existsSync(path.join(ROOT, d)));
  return [app('(dashboard)/teacher/page.tsx'), ...dirs.flatMap((d: string) => listSourceFiles(d))];
}

/** Every page a standalone teacher's learner may open (learner portal spec §2): Today itself, then each allowed page and its sub-pages. */
function learnerEntries(): string[] {
  const dirs = STANDALONE_STUDENT_PAGES.filter((p: string) => p !== '/student').map((p: string) => `src/app/(dashboard)${p}`)
    .filter((d: string) => existsSync(path.join(ROOT, d)));
  return [app('(dashboard)/student/page.tsx'), ...dirs.flatMap((d: string) => listSourceFiles(d))];
}

export const DESIGN_SCOPE: Record<DesignArea, string[]> = {
  'landing+auth': [
    'page.tsx', 'teachers/page.tsx', 'login/page.tsx', 'signup/teacher/page.tsx', 'signup/coach/page.tsx',
    'register-student/page.tsx', 'verify-email/page.tsx', 'forgot-password/page.tsx', 'reset-password/page.tsx',
    'auth/change-password/page.tsx',
  ].map(app),
  shell: [app('layout.tsx'), app('(dashboard)/layout.tsx'), app('(dashboard)/teacher/layout.tsx'), app('(dashboard)/nav-config.ts')],
  'teacher pages': teacherEntries(),
  'learner pages': learnerEntries(),
};

/** Files allowed colour literals, with the reason (ruling R4/R5). */
export const COLOUR_LITERAL_EXEMPT: Record<string, string> = {
  'src/app/teachers/page.tsx': 'campaign palette shared with the ads (ruling R5)',
  'src/components/teachers-landing/StartFreeLink.tsx': 'campaign palette (ruling R5)',
  'src/components/textbook/subject-colours.ts': 'data palette: one colour per subject cover (ruling R4)',
};
