// ============================================================
// Visitor Management Types
// ============================================================

/** Purpose categories for visitor registration */
export type VisitorPurpose =
  | 'meeting'
  | 'delivery'
  | 'maintenance'
  | 'parent_visit'
  | 'government'
  | 'interview'
  | 'contractor'
  | 'other';

/** Late arrival reason categories */
export type LateArrivalReason =
  | 'traffic'
  | 'medical'
  | 'transport'
  | 'family'
  | 'other';

/** Early departure reason categories */
export type EarlyDepartureReason =
  | 'medical'
  | 'appointment'
  | 'family_emergency'
  | 'sport'
  | 'other';

/** Visitor registration status */
export type VisitorStatus = 'checked_in' | 'checked_out';

/** Pre-registration status */
export type PreRegistrationStatus = 'expected' | 'arrived' | 'cancelled' | 'no_show';

/** A populated host/staff reference */
export interface VisitorHost {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
}

/** A populated student reference */
export interface VisitorStudentRef {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  classId?: { id?: string; _id?: string; name?: string } | string;
  admissionNumber?: string;
}

/** Core visitor record returned from GET /visitors */
export interface VisitorRecord {
  id: string;
  _id?: string;
  schoolId: string;
  passNumber: string;
  firstName: string;
  lastName: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  company?: string;
  purpose: VisitorPurpose;
  purposeDetail?: string;
  hostId?: VisitorHost | string;
  hostName?: string;
  vehicleRegistration?: string;
  numberOfVisitors?: number;
  photoUrl?: string;
  checkInTime: string;
  checkOutTime?: string | null;
  status: VisitorStatus;
  checkOutNotes?: string;
  preRegistrationId?: string;
  registeredBy: string;
  duration?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload for POST /visitors */
export interface RegisterVisitorPayload {
  schoolId: string;
  firstName: string;
  lastName: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  company?: string;
  purpose: VisitorPurpose;
  purposeDetail?: string;
  hostId?: string;
  hostName?: string;
  vehicleRegistration?: string;
  numberOfVisitors?: number;
  preRegistrationId?: string;
}

/** Pre-registration record */
export interface PreRegistration {
  id: string;
  _id?: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  company?: string;
  purpose: VisitorPurpose;
  purposeDetail?: string;
  expectedDate: string;
  expectedTime?: string;
  hostId?: VisitorHost | string;
  vehicleRegistration?: string;
  notes?: string;
  status: PreRegistrationStatus;
  registeredBy: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload for POST /visitors/pre-register */
export interface CreatePreRegistrationPayload {
  schoolId: string;
  firstName: string;
  lastName: string;
  company?: string;
  purpose: VisitorPurpose;
  purposeDetail?: string;
  expectedDate: string;
  expectedTime?: string;
  hostId?: string;
  vehicleRegistration?: string;
  notes?: string;
}

/** Late arrival record */
export interface LateArrival {
  id: string;
  _id?: string;
  schoolId: string;
  studentId: VisitorStudentRef | string;
  arrivalTime: string;
  minutesLate: number;
  reason: LateArrivalReason;
  reasonDetail?: string;
  parentNotified: boolean;
  accompaniedBy?: string;
  registeredBy: string;
  isDeleted?: boolean;
  createdAt?: string;
}

/** Payload for POST /visitors/late-arrivals */
export interface RecordLateArrivalPayload {
  schoolId: string;
  studentId: string;
  arrivalTime: string;
  reason: LateArrivalReason;
  reasonDetail?: string;
  parentNotified?: boolean;
  accompaniedBy?: string;
}

/** Early departure record */
export interface EarlyDeparture {
  id: string;
  _id?: string;
  schoolId: string;
  studentId: VisitorStudentRef | string;
  departureTime: string;
  reason: EarlyDepartureReason;
  reasonDetail?: string;
  authorizedById?: VisitorHost | string;
  collectedBy: string;
  collectedByIdNumber?: string;
  collectedByRelation?: string;
  parentNotified: boolean;
  guardianMismatchFlag?: boolean;
  registeredBy: string;
  isDeleted?: boolean;
  createdAt?: string;
}

/** Payload for POST /visitors/early-departures */
export interface RecordEarlyDeparturePayload {
  schoolId: string;
  studentId: string;
  departureTime: string;
  reason: EarlyDepartureReason;
  reasonDetail?: string;
  authorizedById?: string;
  collectedBy: string;
  collectedByIdNumber?: string;
  collectedByRelation?: string;
  parentNotified?: boolean;
}

/** Aggregated daily report */
export interface DailyVisitorReport {
  date: string;
  visitors: {
    totalCheckedIn: number;
    currentlyOnPremises: number;
    checkedOut: number;
    byPurpose: Array<{ purpose: VisitorPurpose; count: number }>;
  };
  lateArrivals: {
    total: number;
    averageMinutesLate: number;
    byReason: Array<{ reason: LateArrivalReason; count: number }>;
    byClass: Array<{ className: string; count: number }>;
  };
  earlyDepartures: {
    total: number;
    byReason: Array<{ reason: EarlyDepartureReason; count: number }>;
  };
  preRegistrations: {
    expected: number;
    arrived: number;
    noShow: number;
  };
}

/** On-premises visitor (simplified for emergency view) */
export interface OnPremisesVisitor {
  id: string;
  _id?: string;
  passNumber: string;
  firstName: string;
  lastName: string;
  purpose: VisitorPurpose;
  hostName?: string;
  checkInTime: string;
  duration?: string;
  vehicleRegistration?: string;
}

/** Paginated visitor list response shape */
export interface VisitorListResponse {
  visitors: VisitorRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
