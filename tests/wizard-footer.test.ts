import { describe, it, expect } from 'vitest';
import { wizardFooterPlacement } from '../src/lib/wizard-footer';

const classes = (s: string): string[] => s.split(/\s+/).filter(Boolean);
/** Classes that apply on a phone (no breakpoint prefix). */
const phone = (s: string): string[] => classes(s).filter((c: string) => !/^(sm|md|lg|xl):/.test(c));

describe('wizardFooterPlacement', () => {
  it('on a phone spans the screen above the bottom nav: no sidebar offset, no width wider than the phone', () => {
    const { outer, inner } = wizardFooterPlacement(false);
    expect(phone(outer)).toEqual(expect.arrayContaining(['left-0', 'right-0', 'bottom-20']));
    expect(phone(outer).filter((c: string) => /^(left-(64|17\.5)|bottom-6)$/.test(c))).toEqual([]);
    expect(phone(inner)).toContain('w-full');
    expect(phone(inner).filter((c: string) => c.startsWith('min-w-'))).toEqual([]);
  });

  it('beside the sidebar on large screens, as before', () => {
    expect(classes(wizardFooterPlacement(false).outer)).toEqual(expect.arrayContaining(['lg:left-64', 'lg:bottom-6']));
    expect(classes(wizardFooterPlacement(true).outer)).toContain('lg:left-17.5');
    expect(classes(wizardFooterPlacement(false).inner)).toEqual(expect.arrayContaining(['lg:w-1/3', 'lg:min-w-110']));
  });
});
