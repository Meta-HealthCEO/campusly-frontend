/**
 * Typed sessionStorage helpers for the printable-credentials-slip flow.
 *
 * Why sessionStorage: the cleartext temp password exists for exactly one
 * network round-trip (the create or regenerate response). After bcrypt
 * hashing on the backend, it cannot be recovered. The dialog writes the
 * slip data on success, the print page reads it, then the dialog clears
 * it on close. 10-minute TTL guards against stale data if the user gets
 * distracted.
 */

const KEY_PREFIX = 'campusly.slip.';
const TTL_MS = 10 * 60 * 1000;

export interface StudentSlipData {
  studentId: string;
  studentName: string;
  loginEmail: string;
  tempPassword: string;
  schoolName: string;
  loginUrl: string;
  writtenAt: number;
}

export function writeSlip(data: Omit<StudentSlipData, 'writtenAt'>): void {
  if (typeof window === 'undefined') return;
  const payload: StudentSlipData = { ...data, writtenAt: Date.now() };
  try {
    window.sessionStorage.setItem(KEY_PREFIX + data.studentId, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable (private mode, quota exceeded) — fail open.
  }
}

export function readSlip(studentId: string): StudentSlipData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY_PREFIX + studentId);
    if (!raw) return null;
    const data = JSON.parse(raw) as StudentSlipData;
    if (Date.now() - data.writtenAt > TTL_MS) {
      window.sessionStorage.removeItem(KEY_PREFIX + studentId);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSlip(studentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(KEY_PREFIX + studentId);
  } catch {
    // Ignore.
  }
}
