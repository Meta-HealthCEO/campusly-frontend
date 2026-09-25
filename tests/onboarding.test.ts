import { describe, expect, it } from 'vitest';
import {
  capsFrameworkId, classOptions, firstLessonHref, firstTeachingTopic, lessonClass, stepAfterScopeSaved, joinMessage, onboardingChecklist, onboardingStep, phaseRank, schoolPairFor, scopeFromPicks,
} from '../src/lib/onboarding';

describe('onboarding', () => {
  it('resumes at the first unfinished step', () => {
    expect(onboardingStep({ hasScope: false, hasClass: false, hasUnit: false, dismissed: false })).toBe(1);
    expect(onboardingStep({ hasScope: true, hasClass: false, hasUnit: false, dismissed: false })).toBe(2);
    expect(onboardingStep({ hasScope: true, hasClass: true, hasUnit: false, dismissed: false })).toBe(3);
    expect(onboardingStep({ hasScope: true, hasClass: true, hasUnit: true, dismissed: false })).toBe('done');
    expect(onboardingStep({ hasScope: true, hasClass: true, hasUnit: false, dismissed: true })).toBe('done');
  });
  it('builds the teaching scope from grade and subject picks, dropping grades with no subject', () => {
    expect(scopeFromPicks([{ gradeId: 'g1', subjectIds: ['s1', 's2'] }, { gradeId: 'g2', subjectIds: [] }]))
      .toEqual({ grades: ['g1'], subjectsByGrade: [{ gradeId: 'g1', subjectIds: ['s1', 's2'] }] });
  });
  it('writes a join message a teacher can paste to learners', () => {
    expect(joinMessage('K7Q2MX', 'https://campusly.co.za'))
      .toBe('Join my class on Campusly: https://campusly.co.za/register-student?code=K7Q2MX (class code K7Q2MX).');
  });
});

describe('onboarding helpers', () => {
  it('finds the CAPS framework by name, falling back to the default', () => {
    expect(capsFrameworkId([{ id: 'ieb', name: 'IEB', isDefault: true }, { id: 'caps', name: 'CAPS', isDefault: false }])).toBe('caps');
    expect(capsFrameworkId([{ id: 'x', name: 'Other', isDefault: true }])).toBe('x');
    expect(capsFrameworkId([])).toBeNull();
  });
  it('orders phases the way schools do', () => {
    const titles = ['FET Phase', 'Senior Phase', 'Foundation Phase', 'Intermediate Phase'];
    expect([...titles].sort((a: string, b: string) => phaseRank(a) - phaseRank(b)))
      .toEqual(['Foundation Phase', 'Intermediate Phase', 'Senior Phase', 'FET Phase']);
  });
  it('offers one class per grade and subject in the scope, named "{Grade} {Subject}"', () => {
    const titles = { g4: 'Grade 4', math: 'Mathematics', eng: 'English Home Language' };
    expect(classOptions({ grades: ['g4'], subjectsByGrade: [{ gradeId: 'g4', subjectIds: ['math', 'eng'] }] }, titles)).toEqual([
      { key: 'g4:math', capsGradeId: 'g4', capsSubjectId: 'math', label: 'Grade 4 Mathematics' },
      { key: 'g4:eng', capsGradeId: 'g4', capsSubjectId: 'eng', label: 'Grade 4 English Home Language' },
    ]);
  });
  it("finds the school's grade and subject made from the CAPS picks", () => {
    const grades = [{ id: 'sg4', curriculumNodeId: 'g4' }, { id: 'sg5', curriculumNodeId: 'g5' }];
    const subjects = [{ id: 'smath', curriculumNodeId: 'math' }];
    expect(schoolPairFor('g4', 'math', grades, subjects)).toEqual({ gradeId: 'sg4', subjectId: 'smath' });
    expect(schoolPairFor('g5', 'eng', grades, subjects)).toBeNull();
  });
});

describe('first lesson link', () => {
  it('opens the lesson builder on the class and topic', () => {
    expect(firstLessonHref('c1', 't9')).toBe('/teacher/courses/new?classId=c1&topicId=t9');
    expect(firstLessonHref('c1', null)).toBe('/teacher/courses/new?classId=c1');
  });
});

describe("Today's getting-started checklist", () => {
  it('shows the same three steps as onboarding, ticked from the same status', () => {
    const items = onboardingChecklist({ hasScope: true, hasClass: false, hasUnit: false, dismissed: false });
    expect(items.map((i) => [i.title, i.done])).toEqual([
      ['Pick what you teach', true], ['Create your first class', false], ['Build your first lesson', false],
    ]);
  });
});

describe('the first lesson topic', () => {
  it('starts with a topic to teach, not an assessment task or revision', () => {
    const topics = [{ title: 'Formal Assessment Task: Project' }, { title: 'Common Fractions' }, { title: 'Revision and Assessment' }];
    expect(firstTeachingTopic(topics)?.title).toBe('Common Fractions');
    expect(firstTeachingTopic([{ title: 'Revision' }])?.title).toBe('Revision');
    expect(firstTeachingTopic([])).toBeNull();
  });
});

describe('standalone teachers can reach the lesson builder', () => {
  it('allows /teacher/courses/new', async () => {
    const { isStandaloneTeacherPathAllowed } = await import('../src/lib/standalone-teacher-paths');
    expect(isStandaloneTeacherPathAllowed('/teacher/courses/new')).toBe(true);
  });
});

describe('after saving what you teach', () => {
  it('goes to the next unfinished step, not always to step 2', () => {
    expect(stepAfterScopeSaved({ hasScope: false, hasClass: false, hasUnit: false, dismissed: false })).toBe(2);
    expect(stepAfterScopeSaved({ hasScope: false, hasClass: true, hasUnit: false, dismissed: false })).toBe(3);
    expect(stepAfterScopeSaved({ hasScope: false, hasClass: true, hasUnit: true, dismissed: false })).toBe('done');
  });
});

describe('the class a first lesson is built for', () => {
  const bare = { classId: 'c1', name: 'Grade 4 Class', gradeId: 'g4', subjectId: null };
  const maths = { classId: 'c2', name: 'Grade 4 Mathematics', gradeId: 'g4', subjectId: 's1' };
  const english = { classId: 'c3', name: 'Grade 4 English', gradeId: 'g4', subjectId: 's2' };
  it('needs a class taught for a subject; a bare class from the old onboarding is not enough', () => {
    expect(lessonClass([bare], null)).toBeNull();
  });
  it('prefers the class just made, else the first class with a subject', () => {
    expect(lessonClass([bare, maths, english], 'c3')).toEqual(english);
    expect(lessonClass([bare, maths, english], null)).toEqual(maths);
  });
});
