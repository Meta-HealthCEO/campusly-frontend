import { create } from 'zustand';

// One quiz system: new homework is an exercise (question-bank questions) or
// a reading — quiz is no longer a creatable homework type here.
export type HomeworkWizardType = 'reading' | 'exercise';

export interface HomeworkWizardState {
  // Step 1
  type: HomeworkWizardType | null;
  title: string;
  subjectId: string;
  classId: string;
  gradeId: string;
  curriculumNodeId: string;
  /** The picked topic's name — so later steps (e.g. Draft with AI) can name it instead of just holding its id. */
  curriculumNodeName: string;
  dueDate: string;
  totalMarks: number;
  latePolicy: 'block' | 'penalty' | 'accept';
  latePenaltyPercent: number;
  gradebookAutoPublish: boolean;
  // Step 2 — type-specific
  contentResourceId: string;
  pageRange: string;
  comprehensionQuestionIds: string[];
  exerciseQuestionIds: string[];
  // Wizard control
  step: 1 | 2 | 3;
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
  curriculumNodeName: '',
  dueDate: '',
  totalMarks: 0,
  latePolicy: 'block',
  latePenaltyPercent: 25,
  gradebookAutoPublish: true,
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
