export type Portal = 'teacher';

/** Which scoped visual identity a user's dashboard wears (null = the default look). */
export function portalForUser(user: { role: string } | null): Portal | null {
  return user?.role === 'teacher' ? 'teacher' : null;
}
