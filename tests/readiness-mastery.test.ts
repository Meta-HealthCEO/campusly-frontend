import { describe, expect, it } from 'vitest';
import { MASTERY_LABEL, marksToGain, masteryLevel } from '../src/lib/readiness/mastery';

describe('masteryLevel (spec §2.1: secure ≥ 70, building 60–69, weak < 60)', () => {
  it.each([[70, 'secure'], [100, 'secure'], [69.9, 'building'], [60, 'building'], [59.9, 'weak'], [0, 'weak']] as const)(
    '%s%% is %s', (pct, level) => {
      expect(masteryLevel(pct)).toBe(level);
    },
  );

  it('clamps out-of-range numbers instead of inventing a level', () => {
    expect(masteryLevel(140)).toBe('secure');
    expect(masteryLevel(-5)).toBe('weak');
  });

  it('refuses NaN: a topic with no evidence is null upstream, never "weak" (ruling R18)', () => {
    expect(() => masteryLevel(Number.NaN)).toThrow(RangeError);
  });

  it('names each level in plain words', () => {
    expect(MASTERY_LABEL).toEqual({ secure: 'Secure', building: 'Building', weak: 'Weak' });
  });
});

describe('marksToGain', () => {
  it('is the marks not yet secured, to one decimal (the mockup figures)', () => {
    expect(marksToGain(35, 49)).toBe(17.9);
    expect(marksToGain(15, 82)).toBe(2.7);
  });

  it('is zero at full mastery and never negative', () => {
    expect(marksToGain(25, 100)).toBe(0);
    expect(marksToGain(25, 120)).toBe(0);
    expect(marksToGain(-3, 50)).toBe(0);
  });
});
