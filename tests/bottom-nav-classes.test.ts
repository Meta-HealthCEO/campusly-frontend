import { describe, expect, it } from 'vitest';
import { TAB_CLASS } from '../src/lib/bottom-nav-classes';

describe('bottom nav tab class', () => {
  it('shares the width equally and is taller than a 44px target', () => {
    expect(TAB_CLASS.split(' ')).toEqual(expect.arrayContaining(['flex-1', 'min-h-14']));
  });
});
