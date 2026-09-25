import { describe, expect, it } from 'vitest';
import { contrastRatio, pairContrast, parseColour } from '../src/lib/design/contrast';
import { resolveTokens } from '../src/lib/design/token-pairs';

describe('parseColour', () => {
  it('reads short and long hex', () => {
    expect(parseColour('#fff')).toEqual([255, 255, 255, 1]);
    expect(parseColour('#1554F0')).toEqual([21, 84, 240, 1]);
  });

  it('reads rgb with commas or spaces and an alpha', () => {
    expect(parseColour('rgba(255, 0, 0, .5)')).toEqual([255, 0, 0, 0.5]);
    expect(parseColour('rgb(11 27 51 / 0.04)')).toEqual([11, 27, 51, 0.04]);
  });

  it('refuses anything else, so an oklch token cannot slip past the check', () => {
    expect(() => parseColour('oklch(1 0 0)')).toThrow(/Unsupported colour/);
  });
});

describe('contrast', () => {
  it('is 21:1 for black on white and 1:1 for a colour on itself', () => {
    expect(contrastRatio(parseColour('#000'), parseColour('#fff'))).toBeCloseTo(21, 5);
    expect(contrastRatio(parseColour('#1554F0'), parseColour('#1554F0'))).toBeCloseTo(1, 5);
  });

  it('judges a 10% tint as painted on its ground (bg-destructive/10 on a card)', () => {
    expect(pairContrast('#B5392A', '#B5392A', '#FFFFFF', 0.1)).toBeCloseTo(5.04, 1);
  });

  it('matches the measured spec values (ruling R6)', () => {
    expect(pairContrast('#5B6B82', '#F3F5FA', '#F3F5FA')).toBeCloseTo(4.97, 1);
    expect(pairContrast('#C2412F', '#FCE8E5', '#FFFFFF')).toBeLessThan(4.5);
  });
});

describe('resolveTokens (a token may reference another, as the mastery scale does)', () => {
  it('follows var(--x) chains to the colour', () => {
    expect(resolveTokens({ a: 'var(--b)', b: 'var(--c)', c: '#0B7F63', d: '#FFFFFF' })).toEqual({ a: '#0B7F63', b: '#0B7F63', c: '#0B7F63', d: '#FFFFFF' });
  });

  it('leaves an unknown or circular reference as written, so the AA test fails on it', () => {
    expect(resolveTokens({ a: 'var(--missing)', b: 'var(--c)', c: 'var(--b)' })).toEqual({ a: 'var(--missing)', b: 'var(--c)', c: 'var(--b)' });
  });
});
