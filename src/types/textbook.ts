// ============================================================
// Textbook Module — Types
// ============================================================

// ─── Enums ───────────────────────────────────────────────────────────────────

export type TextbookStatus = 'draft' | 'published' | 'archived';

// ─── Chapter Resource ────────────────────────────────────────────────────────

export interface ChapterResourceItem {
  resourceId: string | { id: string; title: string; type: string };
  order: number;
}

// ─── Chapter ─────────────────────────────────────────────────────────────────

export interface ChapterItem {
  id: string;
  title: string;
  description: string;
  curriculumNodeId: string | { id: string; title: string; code: string; type: string } | null;
  order: number;
  resources: ChapterResourceItem[];
}

// ─── Textbook ────────────────────────────────────────────────────────────────

export interface TextbookItem {
  id: string;
  title: string;
  description: string;
  frameworkId: string | { id: string; name: string };
  subjectId: string | { id: string; name: string };
  gradeId: string | { id: string; name: string };
  coverImageUrl: string;
  chapters: ChapterItem[];
  status: TextbookStatus;
  schoolId: string | null;
  createdBy: string | { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface CreateTextbookPayload {
  title: string;
  description?: string;
  frameworkId: string;
  subjectId: string;
  gradeId: string;
  coverImageUrl?: string;
}

export interface UpdateTextbookPayload {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  status?: TextbookStatus;
}

export interface AddChapterPayload {
  title: string;
  description?: string;
  curriculumNodeId?: string | null;
  order: number;
}

export interface UpdateChapterPayload {
  title?: string;
  description?: string;
  order?: number;
}

export interface AddResourceToChapterPayload {
  resourceId: string;
  order: number;
}

export interface ReorderChaptersPayload {
  chapterIds: string[];
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface TextbookFilters {
  frameworkId?: string;
  subjectId?: string;
  gradeId?: string;
  status?: TextbookStatus;
  search?: string;
  page?: number;
  limit?: number;
}
