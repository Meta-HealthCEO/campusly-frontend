// ─── Enums ───────────────────────────────────────────────────────────────────

export type QuestionType =
  | 'mcq' | 'true_false' | 'short_answer' | 'structured' | 'essay'
  | 'match' | 'fill_blank' | 'calculation' | 'diagram_label' | 'case_study';

export type QBQuestionSource = 'system' | 'ai_generated' | 'teacher';

export type QuestionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type PaperType =
  | 'class_test' | 'assignment' | 'mid_year' | 'trial' | 'final' | 'custom';

export type PaperStatus = 'draft' | 'finalised' | 'archived';

export type CapsLevel = 'knowledge' | 'routine' | 'complex' | 'problem_solving';

export type BloomsLevel =
  | 'remember' | 'understand' | 'apply' | 'analyse' | 'evaluate' | 'create';

export type MediaType = 'image' | 'diagram' | 'table';

// ─── Sub-documents ───────────────────────────────────────────────────────────

export interface QuestionMedia {
  mediaType: MediaType;
  url: string;
}

export interface QuestionOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface CognitiveLevelPair {
  caps: CapsLevel;
  blooms: BloomsLevel;
}

// ─── Question Item (populated refs) ──────────────────────────────────────────

export interface QuestionItem {
  id: string;
  curriculumNodeId: string | { id: string; title: string };
  schoolId: string | null;
  subjectId: string | { id: string; name: string };
  gradeId: string | { id: string; name: string; level: number };
  type: QuestionType;
  stem: string;
  media: QuestionMedia[];
  options: QuestionOption[];
  answer: string;
  markingRubric: string;
  marks: number;
  cognitiveLevel: CognitiveLevelPair;
  difficulty: number;
  tags: string[];
  source: QBQuestionSource;
  status: QuestionStatus;
  reviewedBy: string | { id: string; firstName: string; lastName: string } | null;
  reviewedAt: string | null;
  createdBy: string | { id: string; firstName: string; lastName: string };
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Paper Sub-documents ─────────────────────────────────────────────────────

export interface PaperQuestionItem {
  questionId: string;
  questionNumber: string;
  marks: number;
  order: number;
}

export interface PaperSectionItem {
  title: string;
  instructions: string;
  order: number;
  questions: PaperQuestionItem[];
}

// ─── CAPS Compliance Report ──────────────────────────────────────────────────

export interface TopicCoverageItem {
  nodeId: string;
  title: string;
  marks: number;
  percent: number;
}

export interface CognitiveDistribution {
  knowledge: number;
  routine: number;
  complex: number;
  problemSolving: number;
}

export interface DifficultySpread {
  easy: number;
  medium: number;
  hard: number;
}

export interface CapsComplianceReport {
  topicCoverage: TopicCoverageItem[];
  cognitiveDistribution: CognitiveDistribution;
  targetDistribution: CognitiveDistribution;
  compliant: boolean;
  violations: string[];
  difficultySpread: DifficultySpread;
}

// ─── Assessment Paper (populated refs) ───────────────────────────────────────

export interface AssessmentPaperItem {
  id: string;
  schoolId: string;
  title: string;
  subjectId: string | { id: string; name: string };
  gradeId: string | { id: string; name: string; level: number };
  term: number;
  year: number;
  paperType: PaperType;
  totalMarks: number;
  duration: number;
  sections: PaperSectionItem[];
  instructions: string;
  capsCompliance: CapsComplianceReport | null;
  status: PaperStatus;
  createdBy: string | { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface CreateQuestionPayload {
  curriculumNodeId: string;
  subjectId: string;
  gradeId: string;
  type: QuestionType;
  stem: string;
  media?: QuestionMedia[];
  options?: QuestionOption[];
  answer?: string;
  markingRubric?: string;
  marks: number;
  cognitiveLevel: CognitiveLevelPair;
  difficulty?: number;
  tags?: string[];
}

export interface UpdateQuestionPayload {
  stem?: string;
  media?: QuestionMedia[];
  options?: QuestionOption[];
  answer?: string;
  markingRubric?: string;
  marks?: number;
  cognitiveLevel?: CognitiveLevelPair;
  difficulty?: number;
  tags?: string[];
}

export interface ReviewQuestionPayload {
  action: 'approve' | 'reject';
  notes?: string;
}

export interface GenerateQuestionsPayload {
  curriculumNodeId: string;
  subjectId: string;
  gradeId: string;
  type: QuestionType;
  count?: number;
  difficulty?: number;
  cognitiveLevel: CognitiveLevelPair;
}

export interface CreatePaperPayload {
  title: string;
  subjectId: string;
  gradeId: string;
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  sections?: PaperSectionItem[];
  instructions?: string;
}

export interface UpdatePaperPayload {
  title?: string;
  term?: number;
  year?: number;
  paperType?: PaperType;
  duration?: number;
  instructions?: string;
  sections?: PaperSectionItem[];
}

export interface GeneratePaperPayload {
  subjectId: string;
  gradeId: string;
  term: number;
  year: number;
  paperType: PaperType;
  totalMarks: number;
  duration: number;
  topicNodeIds?: string[];
  cognitiveWeighting?: CognitiveDistribution;
  difficulty?: 'easy' | 'balanced' | 'challenging';
  instructions?: string;
}

export interface ExtractFromPaperPayload {
  image: string;
  imageType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  subjectId: string;
  gradeId: string;
}

export interface ExtractedQuestionItem {
  stem: string;
  type: QuestionType;
  options: QuestionOption[];
  answer: string;
  markingRubric: string;
  marks: number;
  capsLevel: CapsLevel;
  difficulty: number;
}

export interface AddQuestionToPaperPayload {
  sectionIndex: number;
  questionId: string;
  questionNumber: string;
  marks: number;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface QBQuestionFilters {
  curriculumNodeId?: string;
  type?: QuestionType;
  capsLevel?: CapsLevel;
  difficulty?: number;
  subjectId?: string;
  gradeId?: string;
  status?: QuestionStatus;
  search?: string;
  mine?: boolean;
  page?: number;
  limit?: number;
}

export interface PaperFilters {
  subjectId?: string;
  gradeId?: string;
  status?: PaperStatus;
  paperType?: PaperType;
  search?: string;
  page?: number;
  limit?: number;
}
