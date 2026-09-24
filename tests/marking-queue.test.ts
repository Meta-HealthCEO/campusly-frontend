import { describe, expect, it } from 'vitest';
import { dueTone, markingItemHref, markingTypeLabel } from '../src/lib/marking-queue';

describe('markingItemHref', () => {
  it('trusts the server link', () => {
    expect(markingItemHref({ type: 'paper', id: 'paper:p1:c1', href: '/teacher/papers/p1?tab=marking&classId=c1' }))
      .toBe('/teacher/papers/p1?tab=marking&classId=c1');
  });
  it('builds a paper link when an older server sends none', () => {
    expect(markingItemHref({ type: 'paper', id: 'x', paperId: 'p1', classId: 'c1' })).toBe('/teacher/papers/p1?tab=marking&classId=c1');
  });
  it('opens homework submissions', () => {
    expect(markingItemHref({ type: 'homework', id: 'h1' })).toBe('/teacher/homework/h1');
  });
  it('falls back to AI marking for anything else', () => {
    expect(markingItemHref({ type: 'ai_grading', id: 'a1' })).toBe('/teacher/curriculum/mark-papers');
  });
});

describe('markingTypeLabel', () => {
  it('names test papers plainly', () => {
    expect(markingTypeLabel('paper')).toBe('Test paper');
    expect(markingTypeLabel('homework')).toBe('Homework');
  });
});

describe('dueTone', () => {
  const now = new Date(2026, 8, 24, 10, 0);
  it('reads an ISO due date in local time', () => {
    expect(dueTone(new Date(2026, 8, 23, 12).toISOString(), now)).toBe('overdue');
    expect(dueTone(new Date(2026, 8, 24, 16).toISOString(), now)).toBe('today');
    expect(dueTone(new Date(2026, 8, 27, 9).toISOString(), now)).toBe('later');
  });
  it('has no tone without a date', () => {
    expect(dueTone('', now)).toBe('none');
    expect(dueTone('not a date', now)).toBe('none');
  });
});
