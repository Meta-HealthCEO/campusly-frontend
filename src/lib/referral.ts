/** A learner option in the referral dialog's Student select. */
export interface ReferralStudentOption {
  id: string;
  label: string;
}

/**
 * The Student select's options, with a pre-filled learner guaranteed to appear
 * even when they aren't in the teacher's own classes (the referral was opened
 * from that learner's profile, so their name is already known — it should
 * never fall back to a placeholder just because they're outside the roster
 * `useTeacherClasses` fetched).
 */
export function buildReferralStudentOptions(
  students: ReferralStudentOption[],
  defaultStudentId?: string,
  defaultStudentName?: string,
): ReferralStudentOption[] {
  if (!defaultStudentId || !defaultStudentName) return students;
  if (students.some((s) => s.id === defaultStudentId)) return students;
  return [{ id: defaultStudentId, label: defaultStudentName }, ...students];
}
