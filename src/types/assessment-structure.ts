// ============================================================
// Assessment Structure Types
// ============================================================

// ─── Enums / Literals ─────────────────────────────────────────────────────

export type LineItemStatus = 'pending' | 'capturing' | 'closed';

export type CategoryType =
  | 'test'
  | 'exam'
  | 'assignment'
  | 'practical'
  | 'project'
  | 'other';

export type StructureStatus = 'draft' | 'active' | 'locked';

// ─── Core Entities ────────────────────────────────────────────────────────

export interface LineItem {
  id: string;
  name: string;
  totalMarks: number;
  weight?: number;
  date?: string;
  assessmentId?: string;
  status: LineItemStatus;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  weight: number;
  lineItems: LineItem[];
}

export interface AssessmentStructure {
  id: string;
  teacherId: string;
  schoolId: string | null;
  subjectId: string | null;
  subjectName: string;
  classId: string | null;
  gradeId: string | null;
  term: number;
  academicYear: string;
  name: string;
  studentIds: string[];
  categories: Category[];
  status: StructureStatus;
  lockedAt: string | null;
  unlockedBy: string | null;
  unlockReason: string | null;
  unlockedAt: string | null;
  isTemplate: boolean;
  templateName: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Payload Types ────────────────────────────────────────────────────────

export interface CreateStructurePayload {
  subjectId?: string | null;
  subjectName: string;
  classId?: string | null;
  gradeId?: string | null;
  term: number;
  academicYear: string;
  name: string;
  studentIds?: string[];
  isTemplate?: boolean;
  templateName?: string | null;
}

export interface AddCategoryPayload {
  name: string;
  type: CategoryType;
  weight: number;
}

export interface UpdateCategoryPayload {
  name?: string;
  type?: CategoryType;
  weight?: number;
}

export interface AddLineItemPayload {
  name: string;
  totalMarks: number;
  weight?: number;
  date?: string;
  assessmentId?: string;
}

export interface UpdateLineItemPayload {
  name?: string;
  totalMarks?: number;
  weight?: number;
  date?: string;
  assessmentId?: string;
  status?: LineItemStatus;
}

export interface ClonePayload {
  name: string;
  classId?: string | null;
  gradeId?: string | null;
  term?: number;
  academicYear?: string;
  studentIds?: string[];
}

export interface FromTemplatePayload {
  templateId: string;
  name: string;
  subjectId?: string | null;
  subjectName: string;
  classId?: string | null;
  gradeId?: string | null;
  term: number;
  academicYear: string;
  studentIds?: string[];
}

// ─── Term Marks (Calculation Response) ───────────────────────────────────

export interface TermMarkLineItem {
  lineItemId: string;
  name: string;
  mark: number | null;
  total: number;
  percentage: number | null;
  isAbsent: boolean;
}

export interface StudentCategoryResult {
  categoryId: string;
  name: string;
  weight: number;
  score: number | null;
  lineItems: TermMarkLineItem[];
}

export interface AchievementLevel {
  level: string;
  description: string;
}

export interface StudentTermResult {
  studentId: string;
  studentName: string;
  capturedWeight: number;
  capturedTotal: number;
  projectedTermMark: number | null;
  finalTermMark: number | null;
  achievementLevel: AchievementLevel | null;
  categories: StudentCategoryResult[];
}

export type CategoryStatus = 'pending' | 'partial' | 'complete';

export interface CategorySummaryItem {
  lineItemId: string;
  name: string;
  totalMarks: number;
  studentsCaptured: number;
  studentsPending: number;
}

export interface CategorySummary {
  categoryId: string;
  name: string;
  weight: number;
  status: CategoryStatus;
  lineItems: CategorySummaryItem[];
}

export interface TermMarksResponse {
  structureId: string;
  structureName: string;
  term: number;
  academicYear: string;
  completionPercent: number;
  categories: CategorySummary[];
  students: StudentTermResult[];
}

// ─── Lock Validation ──────────────────────────────────────────────────────

export interface LockError {
  lineItem: string;
  missingStudents: string[];
  missingCount: number;
}
