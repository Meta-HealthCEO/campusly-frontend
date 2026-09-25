import { describe, expect, it } from 'vitest';
import { dueText, todayNextUp } from '../src/lib/standalone-today';
import { readSource } from './support/source';

const now = new Date('2026-09-25T10:00:00Z'); // Friday 25 September, 12:00 SAST

describe('dueText (SAST days)', () => {
  it('says today, tomorrow, a day, or overdue', () => {
    expect(dueText('2026-09-25T20:00:00Z', now)).toBe('Due today');
    expect(dueText('2026-09-26T08:00:00Z', now)).toBe('Due tomorrow');
    expect(dueText('2026-10-03T08:00:00Z', now)).toBe('Due Sat 3 Oct');
    expect(dueText('2026-09-22T08:00:00Z', now)).toBe('Overdue');
  });
});

describe('todayNextUp', () => {
  const homework = { title: 'Waves', detail: 'Due tomorrow', href: '/student/homework/h1' };

  it('continues the current lesson first', () => {
    expect(todayNextUp({ unit: { title: 'Forces', href: '/student/courses/c1', progressPercent: 40 }, homework, test: null }))
      .toEqual({ eyebrow: 'Continue your lesson', title: 'Forces', detail: '40% done', actionLabel: 'Continue', href: '/student/courses/c1' });
  });

  it('then the next homework, then the next test', () => {
    expect(todayNextUp({ unit: null, homework, test: null })?.actionLabel).toBe('Open homework');
    expect(todayNextUp({ unit: null, homework: null, test: { title: 'Quiz', detail: 'Due Mon 28 Sep', href: '/student/tests/p1' } })?.eyebrow).toBe('Next test');
  });

  it('is empty when there is nothing to do', () => {
    expect(todayNextUp({ unit: null, homework: null, test: null })).toBeNull();
  });
});

describe('the Today page', () => {
  it('shows an error with Retry instead of spinning forever (every learner)', () => {
    const page = readSource('src/app/(dashboard)/student/page.tsx');
    expect(page).toContain('<ErrorState');
    expect(page).toContain('onRetry={refresh}');
    expect(page).not.toMatch(/if \(loading \|\| !dashboard\) return <LoadingSpinner/);
  });

  it("hides the old lesson cards, the join card and the free-text widgets from a standalone teacher's learners", () => {
    const today = readSource('src/components/student/StandaloneToday.tsx');
    for (const gone of ['Most recent lesson', 'Lessons this week', 'JoinClassCard', 'RecommendedWidget', 'MasteryWidget']) expect(today).not.toContain(gone);
  });
});
