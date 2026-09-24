import { describe, expect, it } from 'vitest';
import { DISCIPLINE_SEVERITY_STYLES, DISCIPLINE_STATUS_STYLES } from '../src/lib/discipline-styles';
import { attendanceBadgeClass } from '../src/lib/attendance-badge';

// These components are shared with admin pages, which must look as they did
// before the teacher portal work (look spec §2).
describe('discipline chips (shared with /admin/discipline)', () => {
  it('keep their pre-phase-1 look, with serious distinct from moderate', () => {
    expect(DISCIPLINE_SEVERITY_STYLES).toEqual({
      minor: 'bg-slate-100 text-slate-700',
      moderate: 'bg-amber-100 text-amber-700',
      serious: 'bg-orange-100 text-orange-700',
      critical: 'bg-destructive/10 text-destructive',
    });
    expect(DISCIPLINE_STATUS_STYLES.resolved).toBe('bg-emerald-100 text-emerald-700');
  });
});

describe('attendanceBadgeClass (shared with /admin/attendance)', () => {
  it('colours each status one shade from its old badge, on tokens', () => {
    expect(attendanceBadgeClass('present')).toBe('bg-success-soft text-success');
    expect(attendanceBadgeClass('absent')).toBe('bg-destructive-soft text-destructive');
    expect(attendanceBadgeClass('late')).toBe('bg-attention-soft text-attention');
    expect(attendanceBadgeClass('excused')).toBe('bg-info-soft text-info');
  });

  it('leaves an unknown status plain', () => {
    expect(attendanceBadgeClass('holiday')).toBe('');
  });
});
