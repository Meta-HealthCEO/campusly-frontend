// ============================================================
// Student Learning — Types
// ============================================================

export interface AttemptPayload {
  blockId: string;
  curriculumNodeId: string;
  response: string;
  timeSpentSeconds: number;
  hintsUsed: number;
}

export interface AttemptResult {
  id: string;
  correct: boolean;
  score: number;
  maxScore: number;
  attemptNumber: number;
}

export interface StudentMasteryItem {
  id: string;
  studentId: string;
  curriculumNodeId:
    | string
    | { id: string; title: string; code: string; type: string };
  schoolId: string;
  masteryLevel: number;
  attemptCount: number;
  correctCount: number;
  lastAttemptAt: string | null;
  cognitiveBreakdown: {
    knowledge: number;
    routine: number;
    complex: number;
    problemSolving: number;
  };
  weakAreas: string[];
  updatedAt: string;
}

export interface BlockInteractionState {
  blockId: string;
  answered: boolean;
  correct: boolean | null;
  score: number;
  maxScore: number;
  showExplanation: boolean;
  hintsRevealed: number;
  attemptResult: AttemptResult | null;
}

export interface StudentResourceFilters {
  subjectId?: string;
  gradeId?: string;
  term?: number;
  search?: string;
  page?: number;
  limit?: number;
}
