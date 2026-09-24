import { describe, expect, it } from 'vitest';
import {
  learnerClassLabel, learnerQuickStats, teacherLearnerProfilePath, messageSubjectFor, noParentMessage, parentLabel,
  meritPointsLabel, demeritPointsLabel,
} from '../src/lib/learner-profile';
import type { LearnerProfileData } from '../src/types/student-360';

function profile(overrides: Partial<LearnerProfileData> = {}): LearnerProfileData {
  return {
    student: { id: 's1', firstName: 'Lebo', lastName: 'Mthembu', admissionNumber: 'GFP-1', gradeName: 'Grade 1', className: 'A' },
    academic: { subjects: [{ name: 'English', mark: 15, total: 20, percentage: 75 }, { name: 'Maths', mark: 14, total: 20, percentage: 70 }], termAverage: 72.6 },
    attendance: { present: 40, absent: 2, late: 1, excused: 0, percentage: 93.4 },
    homework: { pending: 1, completed: 6, averageMark: 68 },
    achievements: { recent: [], totalMerits: 4, totalDemerits: 1 },
    library: { borrowed: 0, overdue: 0 },
    sports: { cards: [] },
    behaviour: { recentIncidents: [] },
    ...overrides,
  };
}

describe('learnerQuickStats', () => {
  it('summarises marks, attendance, homework and behaviour in teacher terms', () => {
    expect(learnerQuickStats(profile())).toEqual([
      { key: 'average', title: 'Term average', value: '73%', description: '2 subjects' },
      { key: 'attendance', title: 'Attendance', value: '93%', description: '2 days absent' },
      { key: 'homework', title: 'Homework done', value: '6', description: '1 still to hand in' },
      { key: 'merits', title: 'Merits', value: '4', description: '1 demerit' },
    ]);
  });

  it("shows a new learner's empty record as not-yet, not as 0%", () => {
    const stats = learnerQuickStats(profile({
      academic: { subjects: [], termAverage: 0 },
      attendance: { present: 0, absent: 0, late: 0, excused: 0, percentage: 0 },
      homework: { pending: 0, completed: 0, averageMark: 0 },
    }));
    expect(stats[0]).toMatchObject({ value: '—', description: 'No marks yet' });
    expect(stats[1]).toMatchObject({ value: '—', description: 'No registers yet' });
    expect(stats[2]).toMatchObject({ value: '0', description: 'Nothing outstanding' });
  });
});

describe('teacherLearnerProfilePath', () => {
  it("links to the learner's profile", () => {
    expect(teacherLearnerProfilePath('abc123')).toBe('/teacher/students/abc123');
  });
});

describe('learnerClassLabel', () => {
  it('does not repeat the grade when the class name already includes it', () => {
    expect(learnerClassLabel('Grade R', 'Grade R - A')).toBe('Grade R - A');
  });

  it('adds the grade when the class name is just a letter', () => {
    expect(learnerClassLabel('Grade 1', 'A')).toBe('Grade 1 A');
  });

  it('copes with a missing grade or class', () => {
    expect(learnerClassLabel('', 'Grade 1 - A')).toBe('Grade 1 - A');
    expect(learnerClassLabel('Grade 1', '')).toBe('Grade 1');
  });
});

describe('messaging a parent from the profile', () => {
  it('names each parent with how they are related, and suggests a subject', () => {
    expect(parentLabel({ userId: 'u1', name: 'Bongiwe Mthembu', relationship: 'mother' })).toBe('Bongiwe Mthembu (mother)');
    expect(parentLabel({ userId: 'u2', name: 'Sam Dube', relationship: 'guardian' })).toBe('Sam Dube (guardian)');
    expect(messageSubjectFor('Lebo')).toBe('About Lebo');
  });

  it('says what to do when no parent is linked', () => {
    expect(noParentMessage('Lebo')).toBe("No parent is linked to Lebo yet. The school office links parents to learners; ask them to add one.");
  });
});

describe('merit/demerit point badges (Recent Activity card)', () => {
  it('labels totals as points, so they read distinctly from the behaviour timeline\'s entry counts', () => {
    expect(meritPointsLabel(7)).toBe('7 merit points');
    expect(meritPointsLabel(1)).toBe('1 merit point');
    expect(demeritPointsLabel(3)).toBe('3 demerit points');
    expect(demeritPointsLabel(1)).toBe('1 demerit point');
  });
});
