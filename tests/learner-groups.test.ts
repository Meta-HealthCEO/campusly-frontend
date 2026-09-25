import { describe, expect, it } from 'vitest';
import { learnerGroups } from '../src/lib/learner-groups';
import { readSource } from './support/source';
import type { StudentClass } from '../src/hooks/useStudentClasses';

const group = (id: string, name: string, subject: string | null = null): StudentClass => ({
  id, name, classroomCode: 'AB12CD', isHomeroom: false, grade: { id: 'g', name: 'Grade 10' },
  subject: subject ? { id: `s-${id}`, name: subject } : null, teacher: { id: 't', firstName: 'Lindiwe', lastName: 'Dube' },
});

describe('learnerGroups', () => {
  it('lists the own group first, then the others, once each, with the teacher', () => {
    const maths = group('a', 'Grade 10 Mathematics', 'Mathematics');
    const science = group('b', 'Grade 10 Physical Sciences', 'Physical Sciences');
    expect(learnerGroups(maths, [science, maths])).toEqual([
      { id: 'a', name: 'Grade 10 Mathematics', teacher: 'Lindiwe Dube', subject: 'Mathematics' },
      { id: 'b', name: 'Grade 10 Physical Sciences', teacher: 'Lindiwe Dube', subject: 'Physical Sciences' },
    ]);
    expect(learnerGroups(null, [])).toEqual([]);
  });
});

describe("a standalone teacher's learner's Profile", () => {
  it('has no school wording and holds the groups and the join card', () => {
    const profile = readSource('src/components/student/LearnerProfile.tsx');
    expect(profile).not.toMatch(/at school|Admission/);
    expect(profile).toContain('<MyGroupsCard');
    expect(profile).toContain('<JoinGroupCard');
  });

  it('is what the Profile page shows them', () => {
    const page = readSource('src/app/(dashboard)/student/profile/page.tsx');
    expect(page).toMatch(/if \(isStandaloneLearner\) \{?\s*return <LearnerProfile/);
    expect(page.split('\n').length).toBeLessThanOrEqual(350);
  });

  it('labels the code field and never mentions replacing a group', () => {
    const card = readSource('src/components/student/JoinGroupCard.tsx');
    expect(card).toContain('htmlFor="group-code"');
    expect(card).not.toMatch(/replace/i);
  });
});
