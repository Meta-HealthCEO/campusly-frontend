import { describe, expect, it } from 'vitest';
import { paperGenerationAccess } from '../src/lib/paper-access';

const allowance = (remaining: number) => ({ paperGenerations: { limit: 3, used: 3 - remaining, remaining } });

describe('paperGenerationAccess', () => {
  it('lets Pro (or school) teachers generate with no counter', () => {
    expect(paperGenerationAccess(true, allowance(0))).toEqual({ allowed: true, freeRemaining: null, freeLimit: null });
  });

  it('lets a free teacher generate while free papers remain, and says how many', () => {
    expect(paperGenerationAccess(false, allowance(2))).toEqual({ allowed: true, freeRemaining: 2, freeLimit: 3 });
  });

  it('blocks a free teacher once the free papers are used up', () => {
    expect(paperGenerationAccess(false, allowance(0))).toEqual({ allowed: false, freeRemaining: 0, freeLimit: 3 });
  });

  it('blocks when there is no allowance information (fails closed, like before)', () => {
    expect(paperGenerationAccess(false, null)).toEqual({ allowed: false, freeRemaining: null, freeLimit: null });
  });
});
