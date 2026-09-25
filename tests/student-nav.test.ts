import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STANDALONE_STUDENT_NAV } from '../src/lib/nav/student-nav';
import { STANDALONE_STUDENT_PAGES, isStandaloneStudentPathAllowed } from '../src/lib/standalone-student-paths';
import { portalRedirect } from '../src/lib/portal-guard';
import { userFromApi } from '../src/lib/user-from-api';

describe("a standalone teacher's learner's navigation (spec §2)", () => {
  it('has exactly the seven items', () => {
    expect(STANDALONE_STUDENT_NAV.map((i) => `${i.label}:${i.href}`)).toEqual([
      'Today:/student', 'Lessons:/student/courses', 'Homework:/student/homework', 'Tests:/student/tests',
      'Marks:/student/grades', 'AI tutor:/student/ai-tutor', 'Profile:/student/profile',
    ]);
  });

  it('allows every nav link, and every allowed page exists', () => {
    for (const item of STANDALONE_STUDENT_NAV) expect(isStandaloneStudentPathAllowed(item.href), item.href).toBe(true);
    for (const page of STANDALONE_STUDENT_PAGES) expect(existsSync(`src/app/(dashboard)${page}/page.tsx`), page).toBe(true);
  });

  it('allows the sub-pages the spec lists', () => {
    for (const p of ['/student/courses/abc', '/student/courses/abc/learn/def', '/student/homework/abc', '/student/assignments/abc',
      '/student/tests/abc', '/student/ai-tutor/practice', '/student/ai-tutor/practice/history', '/notifications']) {
      expect(isStandaloneStudentPathAllowed(p), p).toBe(true);
    }
  });

  it('keeps the hidden pages out', () => {
    for (const p of ['/student/lessons', '/student/assignments', '/student/timetable', '/student/classroom', '/student/wellbeing',
      '/student/notice-board', '/student/classes', '/student/progress', '/student/wallet', '/teacher']) {
      expect(isStandaloneStudentPathAllowed(p), p).toBe(false);
    }
  });
});

describe('portalRedirect', () => {
  it('sends a standalone learner on a hidden page to Today, and a standalone teacher to theirs', () => {
    expect(portalRedirect({ isStandaloneLearner: true }, '/student/timetable')).toBe('/student');
    expect(portalRedirect({ isStandaloneLearner: true }, '/student/homework/abc')).toBeNull();
    expect(portalRedirect({ isStandaloneTeacher: true }, '/teacher/lessons')).toBe('/teacher');
  });

  it('leaves school learners and teachers alone', () => {
    expect(portalRedirect({}, '/student/timetable')).toBeNull();
    expect(portalRedirect(null, '/student/timetable')).toBeNull();
  });
});

describe('userFromApi', () => {
  it('reads isStandaloneLearner', () => {
    expect(userFromApi({ _id: 'u1', role: 'student', isStandaloneLearner: true }).isStandaloneLearner).toBe(true);
    expect(userFromApi({ _id: 'u1', role: 'student' }).isStandaloneLearner).toBe(false);
  });
});
