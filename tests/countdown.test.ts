import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { countdownText, daysUntil, formatExamDate } from '../src/lib/readiness/countdown';

/**
 * Final review finding 6: days are counted in Africa/Johannesburg calendar days whatever zone the host runs in.
 * An exam stored as midnight SAST is the instant 22:00Z the day before.
 */
const EXAM = new Date('2026-10-26T22:00:00Z'); // Tue 27 Oct 2026, 00:00 SAST
const at = (iso: string) => new Date(iso);

describe.each(['UTC', 'Pacific/Auckland', 'Africa/Johannesburg'])('host time zone %s', (zone) => {
  const original = process.env.TZ;
  beforeAll(() => { process.env.TZ = zone; });
  afterAll(() => { process.env.TZ = original; });

  it('really runs in that zone (guards the test itself)', () => {
    const localDay = EXAM.getDate();
    expect(localDay).toBe(zone === 'UTC' ? 26 : 27);
  });

  it('counts calendar days, as in the mockup', () => {
    expect(countdownText('Paper 1', EXAM, at('2026-09-25T12:00:00Z'))).toBe('32 days to Paper 1 · Tue 27 Oct');
  });

  it('says one day at 23:59 SAST the evening before', () => {
    expect(countdownText('Paper 1', EXAM, at('2026-10-26T21:59:00Z'))).toBe('1 day to Paper 1 · Tue 27 Oct');
  });

  it('says today at 00:30 SAST on exam day', () => {
    expect(countdownText('Paper 1', EXAM, at('2026-10-26T22:30:00Z'))).toBe('Paper 1 is today · Tue 27 Oct');
  });

  it('says it was on the date the day after, never negative days', () => {
    expect(countdownText('Paper 1', EXAM, at('2026-10-28T06:00:00Z'))).toBe('Paper 1 was on Tue 27 Oct');
    expect(daysUntil(EXAM, at('2026-10-28T06:00:00Z'))).toBe(-1);
  });

  it('prints a midnight-SAST exam date as the South African date', () => {
    expect(formatExamDate(EXAM)).toBe('Tue 27 Oct');
    expect(formatExamDate(at('2026-12-31T22:00:00Z'))).toBe('Fri 1 Jan');
  });
});
