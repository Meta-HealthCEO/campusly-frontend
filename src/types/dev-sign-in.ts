/** An account the backend offers for development-only one-click sign-in. */
export interface DevSignInAccount {
  id: string;
  name: string;
  email: string;
  /** The user's role, e.g. 'teacher' or 'school_admin'. */
  role: string;
  /** One line under the name, e.g. "Teacher · Grade 1 - A". */
  detail: string;
  /** True for the developer's own account (DEV_SIGN_IN_EMAILS on the backend). */
  isOwn: boolean;
}

export interface DevSignInGroups {
  own: DevSignInAccount[];
  roles: DevSignInAccount[];
}
