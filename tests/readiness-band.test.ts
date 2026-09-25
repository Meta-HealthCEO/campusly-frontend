import { describe, expect, it } from 'vitest';
import { bandGeometry, bandSentence } from '../src/lib/readiness/band';

describe('bandGeometry', () => {
  it('places the predicted band and the target on a 0–100 scale (the mockup: 58–64 against 75)', () => {
    expect(bandGeometry({ low: 58, high: 64, target: 75 })).toEqual({ left: 58, width: 6, targetAt: 75, toTarget: 11, reachesTarget: false });
  });

  it('accepts the ends in either order and clamps to 0–100', () => {
    expect(bandGeometry({ low: 110, high: 95, target: 120 })).toEqual({ left: 95, width: 5, targetAt: 100, toTarget: 0, reachesTarget: true });
  });
});

describe('bandSentence', () => {
  it('says how far the band is from the target', () => {
    expect(bandSentence({ low: 58, high: 64, target: 75 })).toBe('Heading for 58–64%. Target 75%: 11 points to go.');
  });

  it('says when the band reaches the target', () => {
    expect(bandSentence({ low: 72, high: 80, target: 75 })).toBe('Heading for 72–80%. On track for your 75% target.');
  });
});
