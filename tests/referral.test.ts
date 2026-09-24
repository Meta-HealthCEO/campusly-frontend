import { describe, expect, it } from 'vitest';
import { buildReferralStudentOptions } from '../src/lib/referral';

describe('buildReferralStudentOptions', () => {
  const students = [
    { id: 's1', label: 'Amara Ndlovu' },
    { id: 's2', label: 'Kabelo Sithole' },
  ];

  it('returns the fetched list unchanged when no learner is pre-filled', () => {
    expect(buildReferralStudentOptions(students)).toBe(students);
  });

  it('leaves the list unchanged when the pre-filled learner is already in it', () => {
    expect(buildReferralStudentOptions(students, 's2', 'Kabelo Sithole')).toEqual(students);
  });

  it("shows the pre-filled learner's real name even when they aren't in the teacher's own classes", () => {
    expect(buildReferralStudentOptions(students, 's9', 'Lebo Mthembu')).toEqual([
      { id: 's9', label: 'Lebo Mthembu' },
      ...students,
    ]);
  });

  it('ignores a pre-fill with no name to show (falls back to the fetched list)', () => {
    expect(buildReferralStudentOptions(students, 's9', undefined)).toBe(students);
  });
});
