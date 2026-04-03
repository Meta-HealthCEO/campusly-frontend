export type LeaveType =
  | 'annual'
  | 'sick'
  | 'family_responsibility'
  | 'maternity'
  | 'paternity'
  | 'unpaid'
  | 'study';

export type LeaveStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

export interface LeaveTypeConfig {
  type: LeaveType;
  label: string;
  defaultEntitlement: number;
  unit: string;
  cycleLength: number;
  requiresDocument: boolean;
  requiresDocumentAfterDays: number | null;
  isPaid: boolean;
  isActive: boolean;
}

export interface LeavePolicy {
  id: string;
  schoolId: string;
  leaveTypes: LeaveTypeConfig[];
}

export interface LeaveRequest {
  id: string;
  schoolId: string;
  staffId: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
  };
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  isHalfDay: boolean;
  halfDayPeriod: 'morning' | 'afternoon' | null;
  documentUrl: string | null;
  substituteTeacherId: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  status: LeaveStatus;
  workingDays: number;
  reviewedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  createdAt: string;
}

export interface LeaveBalance {
  id: string;
  staffId: {
    id: string;
    firstName: string;
    lastName: string;
  };
  year: number;
  balances: Array<{
    leaveType: LeaveType;
    entitlement: number;
    used: number;
    pending: number;
    remaining: number;
  }>;
}

export interface LeaveCalendarEntry {
  staffId: string;
  staffName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
}

export interface SubstituteSuggestion {
  staffId: string;
  firstName: string;
  lastName: string;
  department: string;
  subjects: string[];
  isOnLeave: boolean;
  currentLoad: number;
}

export interface LeaveReportSummary {
  totalRequests: number;
  approved: number;
  declined: number;
  pending: number;
  byLeaveType: Array<{ type: string; count: number; totalDays: number }>;
  byDepartment: Array<{
    department: string;
    totalDays: number;
    staffCount: number;
  }>;
  byMonth: Array<{ month: number; totalDays: number }>;
  topUsers: Array<{ staffId: string; staffName: string; totalDays: number }>;
}
