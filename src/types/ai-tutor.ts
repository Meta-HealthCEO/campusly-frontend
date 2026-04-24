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
  topic: string;
  averageMark: number;
  assessmentCount: number;
  recommendation: string;
}

export interface SendMessagePayload {
  conversationId?: string;
  subjectId: string;
  subjectName: string;
  grade: number;
  message: string;
  mode?: TutorMode;
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
