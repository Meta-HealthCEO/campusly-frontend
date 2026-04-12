/**
 * Frontend-facing types for the Courses feature. These mirror the
 * backend's Mongoose interfaces but use `id: string` (the frontend's
 * api-client.ts normalises _id → id in every response) and replace
 * ObjectId values with strings.
 */

export type CourseStatus = 'draft' | 'in_review' | 'published' | 'archived';
export type LessonType = 'content' | 'chapter' | 'homework' | 'quiz';
export type EnrolmentStatus = 'active' | 'completed' | 'dropped';
export type LessonProgressStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface Course {
  id: string;
  schoolId: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  subjectId: { id: string; name: string } | string | null;
  gradeLevel: number | null;
  tags: string[];
  estimatedDurationHours: number | null;
  createdBy: { id: string; firstName: string; lastName: string; email?: string } | string;
  status: CourseStatus;
  publishedBy: { id: string; firstName: string; lastName: string } | string | null;
  publishedAt: string | null;
  reviewNotes: string;
  passMarkPercent: number;
  certificateEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: string;
  schoolId: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseLesson {
  id: string;
  schoolId: string;
  courseId: string;
  moduleId: string;
  orderIndex: number;
  title: string;
  type: LessonType;
  contentResourceId: string | null;
  textbookId: string | null;
  chapterId: string | null;
  homeworkId: string | null;
  quizQuestionIds: string[];
  isGraded: boolean;
  passMarkPercent: number;
  isRequiredToAdvance: boolean;
  maxAttempts: number | null;
  createdAt: string;
  updatedAt: string;
}

/** A course with its modules + lessons stitched in (what the backend's getCourse returns). */
export interface CourseTree extends Course {
  modules: Array<CourseModule & { lessons: CourseLesson[] }>;
}

export interface Enrolment {
  id: string;
  schoolId: string;
  courseId: string | Course;
  studentId: string;
  enrolledBy: string;
  classId: string | null;
  enrolledAt: string;
  status: EnrolmentStatus;
  progressPercent: number;
  completedAt: string | null;
  certificateId: string | null;
}

export interface LessonProgress {
  id: string;
  enrolmentId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  status: LessonProgressStatus;
  completedAt: string | null;
  interactionsDone: number;
  interactionsTotal: number;
  scrolledToEnd: boolean;
}

/** Lesson payload returned by GET /api/enrolments/:id/lessons/:lessonId. */
export interface LessonWithSource {
  lesson: CourseLesson;
  source:
    | { kind: 'content'; resource: ContentResourceLite }
    | { kind: 'chapter'; textbook: { _id: string; title: string }; chapter: ChapterLite }
    | { kind: 'homework'; homework: HomeworkLite }
    | { kind: 'quiz'; questions: QuizQuestionLite[] };
}

export interface ContentResourceLite {
  id: string;
  title: string;
  blocks: Array<{
    blockId: string;
    type: string;
    order: number;
    content: string;
    [key: string]: unknown;
  }>;
}

export interface ChapterLite {
  _id: string;
  title: string;
  description: string;
  order: number;
  resources: Array<{ resourceId: string; order: number }>;
}

export interface HomeworkLite {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
}

export interface QuizQuestionLite {
  id: string;
  type: string;
  stem: string;
  marks: number;
  media: Array<{ mediaType: string; url: string }>;
  diagram: unknown;
  options: Array<{ label: string; text: string }>;
}

export interface QuizAttempt {
  id: string;
  enrolmentId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  attemptNumber: number;
  answers: Array<{
    questionId: string;
    answer: unknown;
    isCorrect: boolean;
    marks: number;
  }>;
  totalMarks: number;
  earnedMarks: number;
  percent: number;
  passed: boolean;
  submittedAt: string;
}

export interface Certificate {
  id: string;
  enrolmentId: string;
  studentId: string;
  courseId: string;
  studentName: string;
  courseName: string;
  schoolName: string;
  issuedAt: string;
  verificationCode: string;
}

/** Return shape of GET /api/courses/:id/analytics. */
export interface CourseAnalytics {
  enrolmentCount: number;
  activeCount: number;
  completedCount: number;
  droppedCount: number;
  completionRate: number;
  avgQuizScore: number;
  certificatesIssued: number;
  perLessonDropOff: Array<{
    lessonId: string;
    title: string;
    orderIndex: number;
    studentsReached: number;
    studentsCompleted: number;
  }>;
  perClassBreakdown: Array<{
    classId: string | null;
    className: string;
    enroled: number;
    completed: number;
  }>;
}

/** Public verify endpoint response. */
export type VerifyCertificateResult =
  | {
      valid: true;
      studentName: string;
      courseName: string;
      schoolName: string;
      issuedAt: string;
    }
  | { valid: false };
