import { describe, it, expect } from 'vitest';
import { LEARNER_KIND_LABEL, currentEnrolment, learnerItemLabel, moduleProgress, resumeTarget, unitDone, type LearnerItem, type LearnerUnit } from '../src/lib/learner-unit';

const item = (id: string, unlockStatus: LearnerItem['unlockStatus'], extra: Partial<LearnerItem> = {}): LearnerItem => ({
  id, title: id, orderIndex: 0, itemKind: 'notes', minutes: 6, unlockStatus, ...extra,
});

function tree(...modules: Array<{ title: string; items: LearnerItem[] }>): LearnerUnit {
  return { id: 'c', title: 'Numbers to 99', modules: modules.map((m, i) => ({ id: `m${i}`, title: m.title, orderIndex: i, lessons: m.items })) };
}

describe('resumeTarget', () => {
  it('points at the first item still to do, with where it sits in the unit', () => {
    const unit = tree(
      { title: 'Counting to 99', items: [item('a', 'completed'), item('b', 'completed'), item('c', 'completed')] },
      { title: 'Number patterns', items: [item('What makes a pattern', 'available', { minutes: 7 }), item('e', 'locked'), item('f', 'locked')] },
    );
    expect(resumeTarget(unit)).toEqual({
      lessonId: 'What makes a pattern', title: 'What makes a pattern', moduleTitle: 'Number patterns',
      position: 'Item 4 of 6', minutes: 7, started: true,
    });
  });

  it('says a unit not yet started, and nothing once everything is done', () => {
    expect(resumeTarget(tree({ title: 'M', items: [item('a', 'available'), item('b', 'locked')] }))).toMatchObject({ lessonId: 'a', position: 'Item 1 of 2', started: false });
    expect(resumeTarget(tree({ title: 'M', items: [item('a', 'in_progress'), item('b', 'locked')] }))).toMatchObject({ lessonId: 'a', started: true });
    expect(resumeTarget(tree({ title: 'M', items: [item('a', 'completed')] }))).toBeNull();
  });
});

describe('moduleProgress and unitDone', () => {
  it('counts what is done', () => {
    const m = { lessons: [item('a', 'completed'), item('b', 'in_progress'), item('c', 'locked')] };
    expect(moduleProgress(m)).toEqual({ done: 1, total: 3, percent: 33 });
    expect(moduleProgress({ lessons: [] })).toEqual({ done: 0, total: 0, percent: 0 });
    expect(unitDone(tree({ title: 'M', items: [item('a', 'completed')] }))).toBe(true);
    expect(unitDone(tree({ title: 'M', items: [item('a', 'completed'), item('b', 'available')] }))).toBe(false);
  });

  it("names items the way a learner thinks of them", () => {
    expect(LEARNER_KIND_LABEL).toEqual({ notes: 'Read', worked_example: 'Worked example', quick_check: 'Quick check' });
  });
});

describe('learnerItemLabel', () => {
  it('labels an AI-generated item by its itemKind', () => {
    expect(learnerItemLabel({ itemKind: 'quick_check' })).toBe('Quick check');
    expect(learnerItemLabel({ itemKind: 'worked_example' })).toBe('Worked example');
  });

  it("labels a hand-built item by its type, not as 'Read' just because itemKind is missing", () => {
    expect(learnerItemLabel({ itemKind: undefined, type: 'quiz' })).toBe('Quiz');
    expect(learnerItemLabel({ itemKind: undefined, type: 'homework' })).toBe('Homework');
    expect(learnerItemLabel({ itemKind: undefined, type: 'content' })).toBe('Read');
    expect(learnerItemLabel({ itemKind: undefined, type: 'chapter' })).toBe('Read');
  });

  it('falls back to Read for an unrecognised or missing type', () => {
    expect(learnerItemLabel({ itemKind: undefined, type: undefined })).toBe('Read');
  });
});

describe('optional revision items', () => {
  it('never become the next item or count toward the unit', () => {
    const unit = tree({ title: 'M', items: [
      item('a', 'completed', { orderIndex: 0 }),
      item('Revision: counting', 'available', { orderIndex: 1, optional: true }),
      item('b', 'available', { orderIndex: 2 }),
    ] });
    expect(resumeTarget(unit)).toMatchObject({ lessonId: 'b', position: 'Item 2 of 2' });
    expect(moduleProgress(unit.modules[0])).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it('a unit is done without its optional items', () => {
    expect(unitDone(tree({ title: 'M', items: [item('a', 'completed'), item('r', 'available', { optional: true })] }))).toBe(true);
  });
});

describe('currentEnrolment', () => {
  const enrolment = (id: string, o: Partial<{ status: string; progressPercent: number; enrolledAt: string }> = {}) => (
    { id, status: 'active', progressPercent: 0, enrolledAt: '2026-01-01T00:00:00Z', ...o }
  );

  it('picks the unit the learner is actually partway through, not just the newest active one', () => {
    const notStartedButNewest = enrolment('a', { progressPercent: 0, enrolledAt: '2026-09-20T00:00:00Z' });
    const inProgress = enrolment('b', { progressPercent: 40, enrolledAt: '2026-09-01T00:00:00Z' });
    expect(currentEnrolment([notStartedButNewest, inProgress])?.id).toBe('b');
  });

  it('falls back to the newest active enrolment when nothing has been started yet', () => {
    const older = enrolment('a', { enrolledAt: '2026-09-01T00:00:00Z' });
    const newer = enrolment('b', { enrolledAt: '2026-09-20T00:00:00Z' });
    expect(currentEnrolment([older, newer])?.id).toBe('b');
  });

  it('among several in-progress units, picks the most recently active', () => {
    const older = enrolment('a', { progressPercent: 20, enrolledAt: '2026-09-01T00:00:00Z' });
    const newer = enrolment('b', { progressPercent: 60, enrolledAt: '2026-09-15T00:00:00Z' });
    expect(currentEnrolment([older, newer])?.id).toBe('b');
  });

  it('ignores completed or dropped enrolments, and is null with nothing active', () => {
    expect(currentEnrolment([enrolment('a', { status: 'completed', progressPercent: 100 })])).toBeNull();
    expect(currentEnrolment([])).toBeNull();
  });
});
