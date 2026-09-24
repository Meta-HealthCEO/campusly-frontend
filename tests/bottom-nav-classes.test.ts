import { describe, expect, it } from 'vitest';
import { FLAT_TAB_CLASS, SECTION_TAB_CLASS } from '../src/lib/bottom-nav-classes';

describe('bottom nav tab classes', () => {
  it('leaves other portals with their original tab sizing', () => {
    expect(FLAT_TAB_CLASS).toBe('flex min-h-11 flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs transition-colors');
  });

  it('gives teacher section tabs equal widths', () => {
    expect(SECTION_TAB_CLASS.split(' ')).toContain('flex-1');
  });
});
