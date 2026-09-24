import { describe, expect, it } from 'vitest';
import { isPolicyAcknowledged } from '../src/lib/policy-acknowledgement';

describe('isPolicyAcknowledged', () => {
  it("is still acknowledging when the policy is on the teacher's to-do list", () => {
    expect(isPolicyAcknowledged('p1', [{ id: 'p1' }, { id: 'p2' }])).toBe(false);
  });

  it('is acknowledged once it drops off the list (including after a duplicate click)', () => {
    expect(isPolicyAcknowledged('p1', [{ id: 'p2' }])).toBe(true);
    expect(isPolicyAcknowledged('p1', [])).toBe(true);
  });

  it("is unknown until the teacher's list has loaded", () => {
    expect(isPolicyAcknowledged('p1', null)).toBeNull();
  });

  it('never claims an archived or draft policy was acknowledged (only active ones are tracked)', () => {
    expect(isPolicyAcknowledged('p1', [], 'archived')).toBeNull();
    expect(isPolicyAcknowledged('p1', [], 'draft')).toBeNull();
    expect(isPolicyAcknowledged('p1', [], 'active')).toBe(true);
  });
});
