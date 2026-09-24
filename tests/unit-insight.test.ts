import { describe, it, expect } from 'vitest';
import { lastSeenLabel, stuckLabel } from '../src/lib/unit-insight';

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
