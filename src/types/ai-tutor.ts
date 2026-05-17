// ============================================================
// AI Tutor Types — Student Tutor, Practice, Report Comments, Parent AI
// ============================================================

export type TutorMode = 'chat' | 'homework_help' | 'practice' | 'exam_prep';

export interface TutorMessage {
  role: 'student' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TutorConversation {
  id: string;
  subjectId: string;
  subjectName: string;
  grade: number;
  mode: TutorMode;
  title: string;
  messages: TutorMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TutorConversationSummary {
  id: string;
  subjectName: string;
  mode: TutorMode;
  title: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface PracticeQuestion {
  questionText: string;
  questionType: 'mcq' | 'short_answer' | 'true_false';
  options?: string[];
  correctAnswer: string;
  studentAnswer?: string;
  isCorrect?: boolean;
  /** Marks actually awarded (supports partial credit on short answers). */
  marksAwarded?: number;
  /** Short marker-style feedback (mainly for short-answer questions). */
  feedback?: string;
  explanation: string;
  marks: number;
}

export interface PracticeAttempt {
  id: string;
  subjectId: string;
  topic: string;
  grade: number;
  questions: PracticeQuestion[];
  score: number;
  totalMarks: number;
  completedAt?: string;
  createdAt: string;
}

export interface WeakArea {
  subject: string;
  subjectId: string;
  averageMark: number;
  assessmentCount: number;
  recommendation: string;
}

// ─── Mastery + Recommendations ──────────────────────────────────────────────

export interface TopicMastery {
  topic: string;
  score: number;
  attempts: number;
}

export interface SubjectMastery {
  subjectId: string;
  subjectName: string;
  score: number | null;
  signalCount: number;
  signals: {
    practice: { count: number; avg: number | null };
    homework: { count: number; avg: number | null };
    marks: { count: number; avg: number | null };
  };
  topics: TopicMastery[];
}

export type RecommendationKind =
  | 'homework_due_soon'
  | 'test_coming_up'
  | 'weak_subject'
  | 'weak_topic';

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  subtitle: string;
  actionHref: string;
  actionLabel?: string;
  priority: number;
}

export interface PracticeHistoryItem {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  grade: number;
  score: number;
  totalMarks: number;
  percentage: number;
  completedAt: string | null;
  createdAt: string;
}

export type BuddySurface =
  | 'free'
  | 'homework'
  | 'lesson'
  | 'lesson_material'
  | 'test_review'
  | 'assignment_review';

export interface BuddyContext {
  surface: BuddySurface;
  surfaceId?: string;
  title?: string;
  questionText?: string;
  studentDraft?: string;
  correctAnswer?: string;
  teacherFeedback?: string;
  curriculumNodeId?: string;
  isAssessmentActive?: boolean;
}

export interface BuddyImagePayload {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Base64-encoded image data without the `data:...,` prefix. */
  base64: string;
}

export interface SendMessagePayload {
  conversationId?: string;
  subjectId: string;
  subjectName: string;
  grade: number;
  message: string;
  mode?: TutorMode;
  context?: BuddyContext;
  image?: BuddyImagePayload;
}

export interface GeneratePracticePayload {
  subjectId: string;
  subjectName: string;
  grade: number;
  topic: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes?: ('mcq' | 'short_answer' | 'true_false')[];
}

export interface SubmitPracticePayload {
  attemptId: string;
  answers: { questionIndex: number; answer: string }[];
}

export interface ReportCommentPayload {
  classId: string;
  subjectId: string;
  term: string;
  tone: 'formal' | 'encouraging' | 'balanced';
  studentIds: string[];
}

export interface ReportComment {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  classId?: string;
  term: number;
  academicYear: number;
  tone: 'encouraging' | 'balanced' | 'formal';
  aiGenerated: string;
  finalText: string;
  comment: string;   // back-compat alias for finalText
  wasEdited: boolean;
  lastEditedAt?: string;
}
