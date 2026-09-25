import { describe, expect, it } from 'vitest';
import { isBillingOwner } from '../src/lib/billing-owner';
import { readSource } from './support/source';

describe('isBillingOwner (spec §2 banners)', () => {
  it('is whoever pays: a standalone teacher or coach, a principal, a school admin', () => {
    expect(isBillingOwner({ role: 'teacher', isStandaloneTeacher: true })).toBe(true);
    expect(isBillingOwner({ role: 'coach', isStandaloneCoach: true })).toBe(true);
    expect(isBillingOwner({ role: 'teacher', isSchoolPrincipal: true })).toBe(true);
    expect(isBillingOwner({ role: 'admin' })).toBe(true);
    expect(isBillingOwner({ role: 'super_admin' })).toBe(true);
  });

  it('is never a learner, a parent or a school teacher', () => {
    expect(isBillingOwner({ role: 'student' })).toBe(false);
    expect(isBillingOwner({ role: 'parent' })).toBe(false);
    expect(isBillingOwner({ role: 'teacher' })).toBe(false);
    expect(isBillingOwner(null)).toBe(false);
  });

  it('gates the trial and billing banners on it', () => {
    const strip = readSource('src/components/layout/BannerStrip.tsx');
    expect(strip).toContain('isBillingOwner(');
    expect(strip).toMatch(/owner \? \(\s*<>\s*<TrialBanner \/>\s*<DunningBanner \/>/);
  });
});
