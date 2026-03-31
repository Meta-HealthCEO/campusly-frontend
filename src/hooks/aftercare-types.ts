/* ── AfterCare module types and helpers ── */

export interface PopulatedStudent {
  _id: string;
  userId?: { firstName?: string; lastName?: string };
  admissionNumber?: string;
  gradeId?: { name?: string } | string;
}

export interface PopulatedUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface AfterCareRegistration {
  id: string;
  studentId: PopulatedStudent | string;
  schoolId: string;
  term: number;
  academicYear: number;
  daysPerWeek: string[];
  monthlyFee: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AfterCareAttendance {
  id: string;
  studentId: PopulatedStudent | string;
  schoolId: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  checkedInBy: PopulatedUser | string | null;
  checkedOutBy: PopulatedUser | string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PickupAuthorization {
  id: string;
  studentId: PopulatedStudent | string;
  schoolId: string;
  authorizedPersonName: string;
  idNumber: string;
  relationship: string;
  phoneNumber: string;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignOutLog {
  id: string;
  attendanceId: string;
  studentId: PopulatedStudent | string;
  schoolId: string;
  pickedUpBy: string;
  pickedUpAt: string;
  isAuthorized: boolean;
  authorizationId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AfterCareActivity {
  id: string;
  schoolId: string;
  date: string;
  activityType: string;
  name: string;
  description: string | null;
  supervisorId: PopulatedUser | string;
  studentIds: (PopulatedStudent | string)[];
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface AfterCareInvoice {
  id: string;
  schoolId: string;
  registrationId: string;
  studentId: PopulatedStudent | string;
  month: number;
  year: number;
  amount: number;
  status: 'pending' | 'invoiced' | 'paid';
  feeInvoiceId: string | null;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentOption {
  id: string;
  name: string;
  grade: string;
  admissionNumber: string;
}

/* ── Helpers ── */

export function mapId<T extends Record<string, unknown>>(item: T): T & { id: string } {
  return { ...item, id: (item._id as string) ?? (item.id as string) };
}

export function getStudentName(s: PopulatedStudent | string): string {
  if (typeof s === 'string') return s;
  const u = s.userId;
  if (u && (u.firstName || u.lastName)) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  return s.admissionNumber ?? s._id;
}

export function getStudentGrade(s: PopulatedStudent | string): string {
  if (typeof s === 'string') return '';
  if (!s.gradeId) return '';
  if (typeof s.gradeId === 'string') return s.gradeId;
  return s.gradeId.name ?? '';
}

export function getUserName(u: PopulatedUser | string | null): string {
  if (!u) return '';
  if (typeof u === 'string') return u;
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u._id;
}
