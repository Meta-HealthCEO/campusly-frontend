import { describe, it, expect } from 'vitest';
import { isStaleCheckRefusal } from '../src/lib/learner-unit';

const refusal = (status: number, error: string) => ({ response: { status, data: { success: false, error } } });

describe('isStaleCheckRefusal', () => {
  it('is true when the server refuses answers to a check that has since changed', () => {
    expect(isStaleCheckRefusal(refusal(400, 'This check changed. Start it again.'))).toBe(true);
  });

  it('is false for any other refusal or failure, so those keep the learner on the same questions', () => {
    expect(isStaleCheckRefusal(refusal(400, 'Quiz lesson has no questions'))).toBe(false);
    expect(isStaleCheckRefusal(refusal(500, 'This check changed. Start it again.'))).toBe(false);
    expect(isStaleCheckRefusal(new Error('Network Error'))).toBe(false);
    expect(isStaleCheckRefusal(null)).toBe(false);
  });
});
