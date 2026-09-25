/** Who must verify their email before using AI: standalone (self-sign-up) teachers only. */
export function needsEmailVerification(
  user: { role: string; isStandaloneTeacher?: boolean; emailVerifiedAt?: string | null } | null,
): boolean {
  if (!user) return false;
  return user.role === 'teacher' && user.isStandaloneTeacher === true && !user.emailVerifiedAt;
}
