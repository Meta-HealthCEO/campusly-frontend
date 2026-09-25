/** Classroom codes are 6 letters or digits; they are shown spaced ("A B 1 2 C D"). */
const CODE_LENGTH = 6;

/** A code from a link or a paste, ready for the form: upper-case, letters and digits only. */
export function codeFromSearch(raw: string | null): string {
  return (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

/** The link a teacher sends: sign-up with the group's code filled in (spec §3). */
export function inviteLink(origin: string, code: string): string {
  return `${origin}/register-student?code=${encodeURIComponent(code)}`;
}
