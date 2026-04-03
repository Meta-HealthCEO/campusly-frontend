// ============================================================
// Pastoral Care Types
// ============================================================

export type ReferralReason =
  | 'academic'
  | 'behavioural'
  | 'emotional'
  | 'social'
  | 'family'
  | 'substance'
  | 'bullying'
  | 'self_harm'
  | 'other';

export type ReferralUrgency = 'low' | 'medium' | 'high' | 'critical';

// Prefixed to avoid conflicts with other modules
export type PastoralReferralStatus =
  | 'referred'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'closed';

// Prefixed to avoid conflicts with other modules
export type PastoralSessionType =
  | 'individual'
  | 'group'
  | 'crisis'
  | 'follow_up'
  | 'consultation';

export type ConfidentialityLevel = 'standard' | 'sensitive' | 'restricted';

export type ReferralOutcome =
  | 'positive'
  | 'ongoing'
  | 'referred_external'
  | 'no_further_action';

// Prefixed to avoid conflicts with other modules
export type PastoralRiskLevel = 'low' | 'medium' | 'high';

// ---- Core Entities ----

export interface PastoralReferral {
  id: string;
  schoolId: string;
  studentId: { id: string; firstName: string; lastName: string; grade?: string };
  referredBy: { id: string; firstName: string; lastName: string };
  assignedCounselorId: string | null;
  reason: ReferralReason;
  urgency: ReferralUrgency;
  status: PastoralReferralStatus;
  description?: string;
  referrerNotes?: string;
  counselorNotes?: string;
  outcome?: ReferralOutcome;
  resolutionNotes?: string;
  resolvedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CounselorSession {
  id: string;
  schoolId: string;
  studentId: { id: string; firstName: string; lastName: string };
  counselorId: { id: string; firstName: string; lastName: string };
  referralId?: string;
  sessionDate: string;
  sessionType: PastoralSessionType;
  duration: number;
  summary: string;
  followUpActions?: string;
  followUpDate?: string;
  confidentialityLevel: ConfidentialityLevel;
  notifyParent?: boolean;
  parentNotificationMessage?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentWellbeingProfile {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    grade: string;
    class?: string;
  };
  referrals: {
    total: number;
    active: number;
    resolved: number;
    recent: Array<{
      id: string;
      reason: ReferralReason;
      urgency: ReferralUrgency;
      status: PastoralReferralStatus;
      referredBy: { firstName: string; lastName: string };
      createdAt: string;
    }>;
  };
  sessions: {
    total: number;
    lastSessionDate: string | null;
    nextFollowUp: string | null;
    sessionTypes: Partial<Record<PastoralSessionType, number>>;
  };
  attendance: {
    overallRate: number;
    recentAbsences: number;
    pattern: string | null;
    trend: string | null;
  };
  academic: {
    overallAverage: number;
    trend: string | null;
    failingSubjects: string[];
    lastTermAverage: number;
  };
  behaviour: {
    merits: number;
    demerits: number;
    recentIncidents: Array<{
      type: string;
      description: string;
      date: string;
    }>;
  };
  riskLevel: PastoralRiskLevel;
  riskFactors: string[];
}

export interface CounselorCaseloadCase {
  studentId: { id: string; firstName: string; lastName: string; grade: string };
  referralId: string;
  reason: ReferralReason;
  status: PastoralReferralStatus;
  sessionCount: number;
  lastSessionDate: string | null;
  nextFollowUp: string | null;
  isOverdue: boolean;
  riskLevel: PastoralRiskLevel;
}

export interface CounselorCaseload {
  activeCases: number;
  pendingReferrals: number;
  overdueFollowUps: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  cases: CounselorCaseloadCase[];
  overdueList: Array<{
    studentId: { id: string; firstName: string; lastName: string };
    nextFollowUp: string;
    daysPastDue: number;
  }>;
}

export interface PastoralReport {
  reportType: string;
  period: { startDate: string; endDate: string };
  data: Array<Record<string, unknown>>;
  totalReferrals?: number;
}

// ---- Payload Types ----

export interface CreateReferralPayload {
  studentId: string;
  reason: ReferralReason;
  description: string;
  urgency: ReferralUrgency;
  referrerNotes?: string;
}

export interface ResolveReferralPayload {
  status: 'resolved' | 'closed';
  outcome: ReferralOutcome;
  resolutionNotes: string;
  notifyReferrer?: boolean;
  notifyParent?: boolean;
}

export interface CreateSessionPayload {
  studentId: string;
  referralId?: string;
  sessionDate: string;
  sessionType: PastoralSessionType;
  duration: number;
  summary: string;
  followUpActions?: string;
  followUpDate?: string;
  confidentialityLevel: ConfidentialityLevel;
  notifyParent?: boolean;
  parentNotificationMessage?: string | null;
}

export interface ReferralFilters {
  page?: number;
  limit?: number;
  status?: PastoralReferralStatus;
  urgency?: ReferralUrgency;
  reason?: ReferralReason;
  studentId?: string;
  assigned?: 'true' | 'false';
}

export interface SessionFilters {
  page?: number;
  limit?: number;
  studentId?: string;
  sessionType?: PastoralSessionType;
  startDate?: string;
  endDate?: string;
  referralId?: string;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  reportType?: 'referral_reasons' | 'sessions_monthly' | 'outcomes' | 'grade_distribution';
}
