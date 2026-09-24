import { describe, expect, it } from 'vitest';
import { summariseMarkingDue, submissionsToMark } from '../src/lib/marking-due';

// Mid-morning local time on 23 September 2026.
const now = new Date(2026, 8, 23, 10, 0);

function item(dueDate: string) {
  return { dueDate };
}

describe('summariseMarkingDue', () => {
  it('counts work due today when the API sends a full ISO timestamp', () => {
    // Homework due dates are stored as UTC midnight of the picked day.
    const result = summariseMarkingDue([item('2026-09-23T00:00:00.000Z')], now);

    expect(result).toEqual({ dueToday: 1, overdue: 0 });
  });

  it('counts anything due before today as overdue', () => {
    const result = summariseMarkingDue(
      [item('2026-09-22T00:00:00.000Z'), item('2026-09-01T00:00:00.000Z')],
      now,
    );

    expect(result).toEqual({ dueToday: 0, overdue: 2 });
  });

  it('ignores work due later', () => {
    const result = summariseMarkingDue([item('2026-09-24T00:00:00.000Z')], now);

    expect(result).toEqual({ dueToday: 0, overdue: 0 });
  });

  it('skips items with a missing or unreadable due date', () => {
    const result = summariseMarkingDue([item(''), item('not-a-date')], now);

    expect(result).toEqual({ dueToday: 0, overdue: 0 });
  });
});

describe('submissionsToMark', () => {
  it('counts submissions, not tasks, so every count of marking agrees', () => {
    expect(submissionsToMark([{ pendingCount: 3 }, { pendingCount: 2 }, { pendingCount: 2 }])).toBe(7);
  });

  it('is zero with nothing waiting', () => {
    expect(submissionsToMark([])).toBe(0);
  });
});
