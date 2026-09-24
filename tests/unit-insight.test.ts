import { describe, it, expect } from 'vitest';
import { lastSeenLabel, learnerStatusLine, revisionTargets, stuckLabel, type InsightLearner, type MissedQuestion } from '../src/lib/unit-insight';

describe('stuckLabel', () => {
  it('says why a learner is stuck, in plain words', () => {
    expect(stuckLabel({ kind: 'failed_check', itemTitle: 'Check: counting', count: 2 })).toBe('Stuck on Check: counting after 2 tries');
    expect(stuckLabel({ kind: 'idle', days: 9 })).toBe('No progress for 9 days');
    expect(stuckLabel(null)).toBeNull();
  });
});

describe('lastSeenLabel', () => {
  it('says when a learner last worked on the unit', () => {
    const now = new Date('2026-09-24T10:00:00');
    expect(lastSeenLabel('2026-09-24T08:00:00', now)).toBe('Today');
    expect(lastSeenLabel('2026-09-23T18:00:00', now)).toBe('Yesterday');
    expect(lastSeenLabel('2026-09-20T09:00:00', now)).toBe('4 days ago');
    expect(lastSeenLabel(null, now)).toBe('Not started');
  });
});

describe('learnerStatusLine', () => {
  const now = new Date('2026-09-24T10:00:00');
  const learner = (l: Partial<InsightLearner>): InsightLearner => ({
    enrolmentId: 'e', name: 'Nomsa', progressPercent: 0, status: 'active', currentItem: { id: 'i1', title: 'Counting in tens' }, lastActivityAt: null, stuck: null, ...l,
  });

  it('says a learner who has never opened the unit has not started', () => {
    expect(learnerStatusLine(learner({}), now)).toBe('Not started');
  });

  it('says where a learner is and when they last worked on it', () => {
    expect(learnerStatusLine(learner({ lastActivityAt: '2026-09-23T15:00:00', progressPercent: 33 }), now)).toBe('On: Counting in tens · Yesterday');
    expect(learnerStatusLine(learner({ status: 'completed', currentItem: null, lastActivityAt: '2026-09-24T08:00:00', progressPercent: 100 }), now)).toBe('Finished the unit · Today');
  });
});

describe('revisionTargets', () => {
  const missed = (questionId: string, itemId: string, itemTitle: string): MissedQuestion => ({ questionId, stem: questionId, itemId, itemTitle, answered: 3, wrong: 2, wrongPercent: 67 });

  it('groups the missed questions by the check they are on, worst check first', () => {
    expect(revisionTargets([missed('a', 'c1', 'Check: counting'), missed('b', 'c2', 'Check: patterns'), missed('c', 'c1', 'Check: counting')])).toEqual([
      { itemId: 'c1', itemTitle: 'Check: counting', questionIds: ['a', 'c'] },
      { itemId: 'c2', itemTitle: 'Check: patterns', questionIds: ['b'] },
    ]);
  });

  it('is empty when nothing was missed', () => {
    expect(revisionTargets([])).toEqual([]);
  });
});
