import { describe, it, expect } from 'vitest';
import {
  lessonListBounds,
  hasActiveLessonFilters,
} from '../src/lib/lesson-list-filters';

describe('lessonListBounds', () => {
  it('returns NO date bounds for "all months" so the whole library is visible', () => {
    // Regression: the list used to default to the current month, which sent
    // dateFrom/dateTo. The backend applies that range inside
    // assignedClasses.$elemMatch, so unassigned draft lessons could never
    // match and the teacher saw "No lessons yet" despite having lessons.
    expect(lessonListBounds('2026', 'all')).toEqual({});
  });

  it('returns month bounds for a specific month', () => {
    expect(lessonListBounds('2026', '07')).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });
  });

  it('handles February in a leap year', () => {
    expect(lessonListBounds('2024', '02')).toEqual({
      dateFrom: '2024-02-01',
      dateTo: '2024-02-29',
    });
  });

  it('handles February in a non-leap year', () => {
    expect(lessonListBounds('2026', '02')).toEqual({
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
    });
  });

  it('returns no bounds for a malformed month rather than a broken range', () => {
    expect(lessonListBounds('2026', '13')).toEqual({});
  });

  it('returns no bounds for a malformed year', () => {
    expect(lessonListBounds('nope', '07')).toEqual({});
  });
});

describe('hasActiveLessonFilters', () => {
  it('is false for the default library view', () => {
    expect(hasActiveLessonFilters({ page: 1, limit: 20 })).toBe(false);
  });

  it('detects a class filter', () => {
    expect(hasActiveLessonFilters({ classId: 'c1' })).toBe(true);
  });

  it('detects a subject filter', () => {
    expect(hasActiveLessonFilters({ subjectId: 's1' })).toBe(true);
  });

  it('detects a date filter', () => {
    expect(hasActiveLessonFilters({ dateFrom: '2026-07-01' })).toBe(true);
    expect(hasActiveLessonFilters({ dateTo: '2026-07-31' })).toBe(true);
  });

  it('detects a published filter', () => {
    expect(hasActiveLessonFilters({ published: true })).toBe(true);
    expect(hasActiveLessonFilters({ published: false })).toBe(true);
  });

  it('ignores whitespace-only search', () => {
    expect(hasActiveLessonFilters({ search: '   ' })).toBe(false);
  });

  it('detects a real search term', () => {
    expect(hasActiveLessonFilters({ search: 'algebra' })).toBe(true);
  });

  it('ignores pagination', () => {
    expect(hasActiveLessonFilters({ page: 3, limit: 50 })).toBe(false);
  });
});
