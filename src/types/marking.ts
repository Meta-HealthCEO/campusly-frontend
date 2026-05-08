// ============================================================
// Marking Types — Module 3 (AI Marking)
// ============================================================
// Canonical types mirroring the backend marking shapes.
// Import directly from '@/types/marking' (NOT via the barrel)
// because PaperMarking conflicts with the legacy inline type
// in `@/hooks/useTeacherMarking` (different shape — no images,
// no paperVersion, different question fields).
// ============================================================

export interface PaperMarkingImage {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageNumber: number;
}

export interface PaperMarkingQuestion {
  questionNumber: string;
  awarded: number;
  maxMarks: number;
  feedback?: string;
  rationale?: string;
  studentResponse?: string;
}

export type PaperMarkingStatus =
  | 'processing'
  | 'completed'
  | 'needs_review'
  | 'failed'
  | 'published';

export type PaperMarkingType = 'generated' | 'assessment';

export interface PaperMarking {
  _id: string;
  schoolId: string;
  teacherId: string;
  paperId: string;
  paperType: PaperMarkingType;
  paperVersion: number;
  studentName: string;
  studentId?: string | null;
  classId?: string | null;
  batchId?: string | null;
  images: PaperMarkingImage[];
  imageCount: number;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  questions: PaperMarkingQuestion[];
  status: PaperMarkingStatus;
  gradebookEntryId?: string | null;
  errorMessage?: string | null;
  extractedHeader?: string | null;
  paperMismatch: boolean;
  mismatchReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MarkingBatchStatus =
  | 'extracting'
  | 'reviewing'
  | 'marking'
  | 'complete'
  | 'failed';

export interface MarkingBatchPageExtract {
  filename: string;
  pageNumber: number;
  extractedName: string | null;
  extractedAdmissionNumber: string | null;
  extractedSectionLabel: string | null;
  confidence: number;
  matchedStudentId: string | null;
}

export interface MarkingBatchAmbiguousMatch {
  imageFilenames: string[];
  extractedName: string | null;
  extractedAdmissionNumber: string | null;
  suggestedStudentIds: string[];
  confidence: number;
}

export interface MarkingBatch {
  _id: string;
  schoolId: string;
  teacherId: string;
  paperId: string;
  paperType: PaperMarkingType;
  classId: string;
  imageCount: number;
  status: MarkingBatchStatus;
  pageExtracts: MarkingBatchPageExtract[];
  matchedCount: number;
  unmatchedCount: number;
  ambiguousMatches: MarkingBatchAmbiguousMatch[];
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmBatchAssignment {
  imageFilenames: string[];
  studentId: string;
  studentName: string;
}
