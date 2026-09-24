import { describe, it, expect } from 'vitest';
import { LEARNER_KIND_LABEL, moduleProgress, resumeTarget, unitDone, type LearnerItem, type LearnerUnit } from '../src/lib/learner-unit';

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
