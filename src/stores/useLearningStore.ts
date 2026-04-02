import { create } from 'zustand';
import type {
  Quiz, StudyMaterial, Rubric, QuizResultsResponse,
  AssignmentSubmission, StudentProgress, StrugglingStudent,
} from '@/components/learning/types';

interface LearningState {
  materials: StudyMaterial[];
  materialsTotal: number;
  materialsLoading: boolean;
  quizzes: Quiz[];
  quizzesTotal: number;
  quizzesLoading: boolean;
  quizResults: QuizResultsResponse | null;
  quizResultsLoading: boolean;
  rubrics: Rubric[];
  rubricsTotal: number;
  rubricsLoading: boolean;
  submissions: AssignmentSubmission[];
  submissionsTotal: number;
  submissionsLoading: boolean;
  studentProgress: StudentProgress[];
  progressLoading: boolean;
  strugglingStudents: StrugglingStudent[];
  strugglingLoading: boolean;

  // State setters
  setMaterials: (materials: StudyMaterial[], total: number) => void;
  setMaterialsLoading: (loading: boolean) => void;
  removeMaterial: (id: string) => void;
  incrementDownload: (id: string) => void;
  setQuizzes: (quizzes: Quiz[], total: number) => void;
  setQuizzesLoading: (loading: boolean) => void;
  updateQuizStatus: (id: string, status: Quiz['status']) => void;
  removeQuiz: (id: string) => void;
  setQuizResults: (results: QuizResultsResponse | null) => void;
  setQuizResultsLoading: (loading: boolean) => void;
  setRubrics: (rubrics: Rubric[], total: number) => void;
  setRubricsLoading: (loading: boolean) => void;
  removeRubric: (id: string) => void;
  setSubmissions: (submissions: AssignmentSubmission[], total: number) => void;
  setSubmissionsLoading: (loading: boolean) => void;
  setStudentProgress: (progress: StudentProgress[]) => void;
  setProgressLoading: (loading: boolean) => void;
  setStrugglingStudents: (students: StrugglingStudent[]) => void;
  setStrugglingLoading: (loading: boolean) => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  materials: [],
  materialsTotal: 0,
  materialsLoading: false,
  quizzes: [],
  quizzesTotal: 0,
  quizzesLoading: false,
  quizResults: null,
  quizResultsLoading: false,
  rubrics: [],
  rubricsTotal: 0,
  rubricsLoading: false,
  submissions: [],
  submissionsTotal: 0,
  submissionsLoading: false,
  studentProgress: [],
  progressLoading: false,
  strugglingStudents: [],
  strugglingLoading: false,

  setMaterials: (materials, total) => set({ materials, materialsTotal: total }),
  setMaterialsLoading: (loading) => set({ materialsLoading: loading }),
  removeMaterial: (id) =>
    set((s) => ({ materials: s.materials.filter((m) => m.id !== id) })),
  incrementDownload: (id) =>
    set((s) => ({
      materials: s.materials.map((m) =>
        m.id === id ? { ...m, downloads: m.downloads + 1 } : m,
      ),
    })),
  setQuizzes: (quizzes, total) => set({ quizzes, quizzesTotal: total }),
  setQuizzesLoading: (loading) => set({ quizzesLoading: loading }),
  updateQuizStatus: (id, status) =>
    set((s) => ({
      quizzes: s.quizzes.map((q) => (q.id === id ? { ...q, status } : q)),
    })),
  removeQuiz: (id) =>
    set((s) => ({ quizzes: s.quizzes.filter((q) => q.id !== id) })),
  setQuizResults: (results) => set({ quizResults: results }),
  setQuizResultsLoading: (loading) => set({ quizResultsLoading: loading }),
  setRubrics: (rubrics, total) => set({ rubrics, rubricsTotal: total }),
  setRubricsLoading: (loading) => set({ rubricsLoading: loading }),
  removeRubric: (id) =>
    set((s) => ({ rubrics: s.rubrics.filter((r) => r.id !== id) })),
  setSubmissions: (submissions, total) =>
    set({ submissions, submissionsTotal: total }),
  setSubmissionsLoading: (loading) => set({ submissionsLoading: loading }),
  setStudentProgress: (progress) => set({ studentProgress: progress }),
  setProgressLoading: (loading) => set({ progressLoading: loading }),
  setStrugglingStudents: (students) => set({ strugglingStudents: students }),
  setStrugglingLoading: (loading) => set({ strugglingLoading: loading }),
}));
