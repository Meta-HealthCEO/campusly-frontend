// ============================================================
// Lesson Plan Types (Module 1)
// ============================================================
//
// `curriculumTopicId` is now required (every lesson must hang off a
// CAPS curriculum topic). `homeworkIds` replaces the legacy
// free-text `homework` field — homework is structured, typed, and
// may be populated (full Homework documents) on detail fetch.
// ============================================================

import type { Homework } from './homework';

export interface LessonPlan {
  _id: string;
  teacherId: string | { firstName: string; lastName: string; email: string };
  schoolId: string;
  subjectId: string | { _id: string; name: string; code?: string };
  classId: string | { _id: string; name: string };
  /** Required — every lesson plan anchors to a curriculum topic. */
  curriculumTopicId: string | { _id: string; title: string; code?: string };
  date: string;
  topic: string;
  durationMinutes: number;
  objectives: string[];
  activities: string[];
  resources: string[];
  /** IDs on list fetches; populated Homework[] on detail fetches. */
  homeworkIds: string[] | Homework[];
  reflectionNotes?: string;
  aiGenerated: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── AI Generation ──────────────────────────────────────────────────────────
//
// The AI never emits real DB IDs — it emits descriptive suggestions
// that seed the HomeworkBuilder picker. The teacher confirms each
// suggestion by picking a real entity (Quiz / ContentResource /
// Question[]) before saving.

export type HomeworkSuggestion =
  | {
      type: 'quiz';
      title: string;
      questionCount: number;
      topicHint: string;
    }
  | {
      type: 'reading';
      title: string;
      pageRangeHint?: string;
      topicHint: string;
    }
  | {
      type: 'exercise';
      title: string;
      questionCount: number;
      topicHint: string;
    };

export interface AIGeneratedLessonDraft {
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homeworkSuggestions: HomeworkSuggestion[];
}
