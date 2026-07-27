import { describe, it, expect } from 'vitest';
import {
  createDefaultInteraction,
  applyAttemptToInteraction,
} from '../src/lib/block-interactions';
import type { AttemptResult } from '../src/types/student-learning';

describe('createDefaultInteraction', () => {
  it('starts unanswered with no result', () => {
    expect(createDefaultInteraction('b1')).toEqual({
      blockId: 'b1',
      answered: false,
      correct: null,
      score: 0,
      maxScore: 0,
      showExplanation: false,
      hintsRevealed: 0,
      attemptResult: null,
    });
  });
});

describe('applyAttemptToInteraction', () => {
  const result: AttemptResult = {
    id: 'a1',
    correct: true,
    score: 2,
    maxScore: 2,
    attemptNumber: 1,
  };

  it('marks the block answered and reveals the explanation', () => {
    const next = applyAttemptToInteraction(createDefaultInteraction('b1'), result);
    expect(next.answered).toBe(true);
    expect(next.correct).toBe(true);
    expect(next.score).toBe(2);
    expect(next.maxScore).toBe(2);
    expect(next.showExplanation).toBe(true);
    expect(next.attemptResult).toBe(result);
  });

  it('supports an ungraded verdict (correct stays null)', () => {
    const next = applyAttemptToInteraction(
      createDefaultInteraction('b1'),
      { ...result, correct: false },
      null,
    );
    expect(next.answered).toBe(true);
    expect(next.correct).toBeNull();
  });

  it('does not mutate the previous state', () => {
    const prev = createDefaultInteraction('b1');
    applyAttemptToInteraction(prev, result);
    expect(prev.answered).toBe(false);
    expect(prev.attemptResult).toBeNull();
  });

  it('preserves hints already revealed', () => {
    const prev = { ...createDefaultInteraction('b1'), hintsRevealed: 2 };
    const next = applyAttemptToInteraction(prev, result);
    expect(next.hintsRevealed).toBe(2);
  });
});
