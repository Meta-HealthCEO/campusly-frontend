import { describe, it, expect } from 'vitest';
import { QUIZZES_MOVED, WIZARD_HOMEWORK_TYPES } from '../src/lib/homework-types';

describe('one quiz system', () => {
  it('new homework is an exercise or a reading: quiz homework is now an exercise', () => {
    expect(WIZARD_HOMEWORK_TYPES.map((t) => t.value)).toEqual(['exercise', 'reading']);
    expect(WIZARD_HOMEWORK_TYPES[0]).toMatchObject({ label: 'Exercise', description: 'Questions from the question bank, marked for you' });
  });

  it('tells admins where quizzes are made now', () => {
    expect(QUIZZES_MOVED).toBe('New quizzes are made from the question bank: set homework as an exercise, or add a quick check to a course. The quizzes below still work until they move to the question bank.');
  });
});
