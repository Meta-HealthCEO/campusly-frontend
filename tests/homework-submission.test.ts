import { describe, it, expect } from 'vitest';
import { submissionForHomework } from '../src/lib/homework-helpers';

describe('submissionForHomework', () => {
  it("finds the learner's submission whether homeworkId comes back as an id or populated", () => {
    const subs = [
      { id: 's1', homeworkId: { _id: 'h1', title: 'Fractions' } },
      { id: 's2', homeworkId: 'h2' },
    ];
    expect(submissionForHomework(subs, 'h1')?.id).toBe('s1');
    expect(submissionForHomework(subs, 'h2')?.id).toBe('s2');
    expect(submissionForHomework(subs, 'h3')).toBeNull();
  });
});
