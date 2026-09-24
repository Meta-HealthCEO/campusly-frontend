import { describe, expect, it } from 'vitest';
import { leaveRemaining } from '../src/lib/leave-balance';

describe('leaveRemaining', () => {
  it('is what is left after days used and days waiting for approval', () => {
    expect(leaveRemaining({ entitlement: 15, used: 3, pending: 2 })).toBe(10);
  });

  it('uses the API figure when it sends one', () => {
    expect(leaveRemaining({ entitlement: 15, used: 3, pending: 2, remaining: 9 })).toBe(9);
  });

  it('never goes below zero', () => {
    expect(leaveRemaining({ entitlement: 2, used: 3, pending: 0 })).toBe(0);
  });
});
