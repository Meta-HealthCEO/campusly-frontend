import { describe, expect, it } from 'vitest';
import { countdownText, daysUntil, formatExamDate } from '../src/lib/readiness/countdown';

const exam = new Date(2026, 9, 27, 9, 0); // Tue 27 Oct 2026, 09:00 local

describe('countdownText (spec §1: "32 days to Paper 1 · Tue 27 Oct")', () => {
  it('counts calendar days, as in the mockup', () => {
    expect(countdownText('Paper 1', exam, new Date(2026, 8, 25, 14, 0))).toBe('32 days to Paper 1 · Tue 27 Oct');
  });

  it('says one day the evening before, even at 23:59 local time', () => {
    expect(countdownText('Paper 1', exam, new Date(2026, 9, 26, 23, 59))).toBe('1 day to Paper 1 · Tue 27 Oct');
  });

  it('says today from just after midnight on the day', () => {
    expect(countdownText('Paper 1', exam, new Date(2026, 9, 27, 0, 5))).toBe('Paper 1 is today · Tue 27 Oct');
  });

  it('never counts negative days after the exam', () => {
    expect(countdownText('Paper 1', exam, new Date(2026, 9, 28, 8, 0))).toBe('Paper 1 was on Tue 27 Oct');
    expect(daysUntil(exam, new Date(2026, 9, 28))).toBe(-1);
  });
});

describe('formatExamDate', () => {
  it('writes short weekday, day and month without the locale', () => {
    expect(formatExamDate(new Date(2027, 0, 1))).toBe('Fri 1 Jan');
  });
});
