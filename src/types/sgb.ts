// ============================================================
// SGB (School Governing Body) Portal Types
// ============================================================

export type SgbPosition = 'chairperson' | 'deputy_chairperson' | 'secretary' | 'treasurer' | 'member' | 'co_opted';
export type SgbMemberStatus = 'pending' | 'active' | 'inactive';
export type SgbMeetingType = 'ordinary' | 'special' | 'annual_general';
export type SgbMeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type SgbResolutionCategory = 'financial' | 'policy' | 'staffing' | 'infrastructure' | 'curriculum' | 'general';
export type SgbResolutionStatus = 'proposed' | 'passed' | 'rejected' | 'deferred';
export type SgbDocumentCategory = 'policy' | 'financial_statement' | 'audit_report' | 'minutes' | 'constitution' | 'annual_report' | 'other';
export type SgbVoteChoice = 'for' | 'against' | 'abstain';
export type SipGoalCategory = 'academic' | 'infrastructure' | 'governance' | 'financial' | 'community';
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export interface SgbMember {
  id: string;
  userId?: { id: string; firstName: string; lastName: string; email: string };
  schoolId: string;
  email: string;
  firstName: string;
  lastName: string;
  position: SgbPosition;
  term?: string;
  status: SgbMemberStatus;
  invitedBy: string;
  invitedAt: string;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SgbAgendaItem {
  title: string;
  presenter?: string;
  duration?: number;
}

export interface SgbMeeting {
  id: string;
  schoolId: string;
  title: string;
  date: string;
  venue: string;
  type: SgbMeetingType;
  status: SgbMeetingStatus;
  agenda: SgbAgendaItem[];
  minutes?: string;
  attendees: SgbMember[];
  apologies: SgbMember[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SgbVoterRecord {
  voterId: string;
  vote: SgbVoteChoice;
  votedAt: string;
}

export interface SgbResolution {
  id: string;
  meetingId: string | { id: string; title: string; date: string };
  schoolId: string;
  title: string;
  description?: string;
  category: SgbResolutionCategory;
  status: SgbResolutionStatus;
  requiresVote: boolean;
  votes: { for: number; against: number; abstain: number };
  voterRecords: SgbVoterRecord[];
  linkedDocumentId?: string | { id: string; title: string; category: string };
  proposedBy: string | { id: string; firstName: string; lastName: string };
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SgbDocument {
  id: string;
  schoolId: string;
  title: string;
  category: SgbDocumentCategory;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  policyReviewDate?: string;
  version: number;
  uploadedBy: string | { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummary {
  period: string;
  year: number;
  income: {
    totalFeesBilled: number;
    totalFeesCollected: number;
    collectionRate: number;
    otherIncome: number;
    totalIncome: number;
  };
  expenditure: {
    salaries: number;
    maintenance: number;
    supplies: number;
    utilities: number;
    transport: number;
    other: number;
    totalExpenditure: number;
  };
  balance: {
    netPosition: number;
    bankBalance: number;
    outstandingFees: number;
  };
  budgetComparison: {
    budgetedIncome: number;
    actualIncome: number;
    budgetedExpenditure: number;
    actualExpenditure: number;
    incomeVariance: number;
    expenditureVariance: number;
  } | null;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenditure: number;
}

export interface GradeEnrollment {
  grade: string;
  gradeId: string;
  count: number;
  capacity: number;
}

export interface YearOverYear {
  year: number;
  total: number;
}

export interface EnrollmentSummary {
  totalStudents: number;
  byGrade: GradeEnrollment[];
  newEnrollments: number;
  departures: number;
  netChange: number;
  genderSplit: { male: number; female: number };
  yearOverYear: YearOverYear[];
}

export interface PolicyComplianceItem {
  documentId: string;
  title: string;
  category: string;
  policyReviewDate: string | null;
  status: 'up_to_date' | 'due_for_review' | 'overdue';
  daysPastDue: number;
}

export interface PolicyComplianceSummary {
  totalPolicies: number;
  upToDate: number;
  dueForReview: number;
  overdue: number;
  policies: PolicyComplianceItem[];
}

export interface SipMilestone {
  title: string;
  targetDate: string;
  status: MilestoneStatus;
  completedDate?: string;
}

export interface SipGoal {
  title: string;
  category: SipGoalCategory;
  milestones: SipMilestone[];
  progress: number;
}

export interface SchoolImprovementPlan {
  id: string;
  schoolId: string;
  year: number;
  goals: SipGoal[];
  overallProgress: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Payload types ──────────────────────────────────────────────────────────

export interface InviteSgbMemberPayload {
  email: string;
  firstName: string;
  lastName: string;
  position: SgbPosition;
  term?: string;
}

export interface CreateMeetingPayload {
  title: string;
  date: string;
  venue: string;
  type: SgbMeetingType;
  agenda?: SgbAgendaItem[];
}

export interface RecordMinutesPayload {
  content: string;
  attendees?: string[];
  apologies?: string[];
}

export interface CreateResolutionPayload {
  title: string;
  description?: string;
  category: SgbResolutionCategory;
  requiresVote?: boolean;
}

export interface ProposePolicyPayload {
  documentId: string;
  title: string;
  description?: string;
  meetingId: string;
}

export interface UpsertSipPayload {
  year: number;
  goals: Array<{
    title: string;
    category: SipGoalCategory;
    milestones: Array<{
      title: string;
      targetDate: string;
      status: MilestoneStatus;
      completedDate?: string;
    }>;
  }>;
}
