import { create } from 'zustand';

export type HomeworkWizardType = 'quiz' | 'reading' | 'exercise';

export interface HomeworkWizardState {
  // Step 1
  type: HomeworkWizardType | null;
  title: string;
  subjectId: string;
  classId: string;
  gradeId: string;
  curriculumNodeId: string;
  dueDate: string;
  totalMarks: number;
  latePolicy: 'block' | 'penalty' | 'accept';
  latePenaltyPercent: number;
  gradebookAutoPublish: boolean;
  // Step 2 — type-specific
  quizId: string;
  contentResourceId: string;
  pageRange: string;
  comprehensionQuestionIds: string[];
  exerciseQuestionIds: string[];
  // Wizard control
  step: 1 | 2 | 3 | 4;
  // Setters
  set: (patch: Partial<HomeworkWizardState>) => void;
  reset: () => void;
}

const INITIAL: Omit<HomeworkWizardState, 'set' | 'reset'> = {
  type: null,
  title: '',
  subjectId: '',
  classId: '',
  gradeId: '',
  curriculumNodeId: '',
  dueDate: '',
  totalMarks: 0,
  latePolicy: 'block',
  latePenaltyPercent: 25,
  gradebookAutoPublish: true,
  quizId: '',
  contentResourceId: '',
  pageRange: '',
  comprehensionQuestionIds: [],
  exerciseQuestionIds: [],
  step: 1,
};

export const useTeacherHomeworkWizardStore = create<HomeworkWizardState>((set) => ({
  ...INITIAL,
  set: (patch) => set(patch),
  reset: () => set(INITIAL),
}));
