// ─── Enums ────────────────────────────────────────────────────────────────────

export type SIPStatus = 'draft' | 'active' | 'completed' | 'archived';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';
export type GoalPriority = 'high' | 'medium' | 'low';
export type PolicyCategory = 'hr' | 'academic' | 'safety' | 'financial' | 'governance' | 'general';
export type PolicyStatus = 'draft' | 'active' | 'under_review' | 'archived';
export type RAGStatus = 'red' | 'amber' | 'green';

// ─── SIP Plan ─────────────────────────────────────────────────────────────────

export interface SIPPlan {
  id: string;
  schoolId: string;
  title: string;
  year: number;
  description?: string;
  startDate: string;
  endDate: string;
  status: SIPStatus;
  createdBy: string | { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSIPPlanPayload {
  title: string;
  year: number;
  description?: string;
  startDate: string;
  endDate: string;
}

// ─── SIP Goal ─────────────────────────────────────────────────────────────────

export interface SIPGoal {
  id: string;
  sipId: string;
  schoolId: string;
  title: string;
  description?: string;
  wseArea: number;
  responsiblePersonId?: string | { id: string; firstName: string; lastName: string };
  targetDate: string;
  completionPercent: number;
  status: GoalStatus;
  priority: GoalPriority;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSIPGoalPayload {
  title: string;
  description?: string;
  wseArea: number;
  responsiblePersonId?: string;
  targetDate: string;
  priority?: GoalPriority;
}

// ─── SIP Evidence ─────────────────────────────────────────────────────────────

export interface SIPEvidence {
  id: string;
  goalId: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  uploadedBy: string | { id: string; firstName: string; lastName: string };
  createdAt: string;
}

// ─── SIP Review ───────────────────────────────────────────────────────────────

export interface SIPReview {
  id: string;
  goalId: string;
  quarter: number;
  year: number;
  notes: string;
  completionPercent: number;
  reviewedBy: string | { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface CreateSIPReviewPayload {
  quarter: number;
  year: number;
  notes: string;
  completionPercent: number;
}

// ─── SIP Dashboard ────────────────────────────────────────────────────────────

export interface WSEAreaSummary {
  wseArea: number;
  wseLabel: string;
  goalCount: number;
  completed: number;
  inProgress: number;
  overdue: number;
  avgCompletion: number;
  rag: RAGStatus;
}

export interface SIPDashboard {
  planId: string;
  planTitle: string;
  year: number;
  totalGoals: number;
  completed: number;
  inProgress: number;
  overdue: number;
  notStarted: number;
  overallCompletion: number;
  overallRAG: RAGStatus;
  byWSEArea: WSEAreaSummary[];
}

// ─── Policy ───────────────────────────────────────────────────────────────────

export interface PolicyVersion {
  version: number;
  content?: string;
  fileUrl?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Policy {
  id: string;
  schoolId: string;
  title: string;
  category: PolicyCategory;
  content?: string;
  fileUrl?: string;
  version: number;
  previousVersions?: PolicyVersion[];
  status: PolicyStatus;
  reviewDate?: string;
  lastReviewedAt?: string;
  lastReviewedBy?: string | { id: string; firstName: string; lastName: string };
  createdBy: string | { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyPayload {
  title: string;
  category: PolicyCategory;
  content?: string;
  fileUrl?: string;
  status?: PolicyStatus;
  reviewDate?: string;
}

// ─── Policy Acknowledgement ───────────────────────────────────────────────────

export interface PolicyAcknowledgement {
  id: string;
  policyId: string;
  userId: string | { id: string; firstName: string; lastName: string; email: string };
  acknowledgedAt: string;
  version: number;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface SIPFilters {
  year?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PolicyFilters {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}
