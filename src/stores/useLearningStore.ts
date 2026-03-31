import { create } from 'zustand';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, mapId, extractTotal, extractErrorMessage } from './learningHelpers';
import type {
  Quiz, StudyMaterial, Rubric, QuizAttempt, QuizResultsResponse,
  AssignmentSubmission, StudentProgress, StrugglingStudent,
  CreateQuizInput, CreateMaterialInput, CreateRubricInput, GradeSubmissionInput,
  QuizAnswer,
} from '@/components/learning/types';

interface LearningState {
  materials: StudyMaterial[]; materialsTotal: number; materialsLoading: boolean;
  quizzes: Quiz[]; quizzesTotal: number; quizzesLoading: boolean;
  quizResults: QuizResultsResponse | null; quizResultsLoading: boolean;
  rubrics: Rubric[]; rubricsTotal: number; rubricsLoading: boolean;
  submissions: AssignmentSubmission[]; submissionsTotal: number; submissionsLoading: boolean;
  studentProgress: StudentProgress[]; progressLoading: boolean;
  strugglingStudents: StrugglingStudent[]; strugglingLoading: boolean;

  fetchMaterials: (params?: Record<string, string>) => Promise<void>;
  uploadMaterial: (data: CreateMaterialInput) => Promise<void>;
  updateMaterial: (id: string, data: Partial<CreateMaterialInput>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  recordDownload: (id: string) => Promise<void>;
  fetchQuizzes: (params?: Record<string, string>) => Promise<void>;
  createQuiz: (data: CreateQuizInput) => Promise<void>;
  updateQuiz: (id: string, data: Partial<CreateQuizInput>) => Promise<void>;
  publishQuiz: (id: string, status: 'published' | 'closed') => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  fetchQuizResults: (quizId: string) => Promise<void>;
  submitQuizAttempt: (quizId: string, answers: QuizAnswer[], startedAt: string) => Promise<QuizAttempt>;
  fetchRubrics: (params?: Record<string, string>) => Promise<void>;
  createRubric: (data: CreateRubricInput) => Promise<void>;
  updateRubric: (id: string, data: Partial<CreateRubricInput>) => Promise<void>;
  deleteRubric: (id: string) => Promise<void>;
  fetchSubmissions: (homeworkId: string, params?: Record<string, string>) => Promise<void>;
  saveDraft: (homeworkId: string, files: string[]) => Promise<void>;
  submitFinal: (homeworkId: string, files: string[]) => Promise<void>;
  gradeSubmission: (id: string, data: GradeSubmissionInput) => Promise<void>;
  requestRevision: (id: string) => Promise<void>;
  enablePeerReview: (homeworkId: string) => Promise<void>;
  submitPeerReview: (id: string, rating: number, comments: string) => Promise<void>;
  fetchStudentProgress: (studentId: string, subjectId?: string) => Promise<void>;
  calculateMastery: (studentId: string, subjectId: string, params?: Record<string, string>) => Promise<void>;
  fetchStrugglingStudents: (classId: string) => Promise<void>;
}

export const useLearningStore = create<LearningState>((set) => ({
  materials: [], materialsTotal: 0, materialsLoading: false,
  quizzes: [], quizzesTotal: 0, quizzesLoading: false,
  quizResults: null, quizResultsLoading: false,
  rubrics: [], rubricsTotal: 0, rubricsLoading: false,
  submissions: [], submissionsTotal: 0, submissionsLoading: false,
  studentProgress: [], progressLoading: false,
  strugglingStudents: [], strugglingLoading: false,

  fetchMaterials: async (params) => {
    set({ materialsLoading: true });
    try {
      const res = await apiClient.get('/learning/materials', { params });
      const raw = res.data.data ?? res.data;
      const arr = unwrapList<StudyMaterial>(raw);
      set({ materials: arr.map(mapId), materialsTotal: extractTotal(raw, arr.length) });
    } catch { console.error('Failed to fetch materials'); }
    finally { set({ materialsLoading: false }); }
  },
  uploadMaterial: async (data) => {
    try { await apiClient.post('/learning/materials', data); toast.success('Material uploaded successfully'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to upload material')); throw new Error('upload failed'); }
  },
  updateMaterial: async (id, data) => {
    try { await apiClient.put(`/learning/materials/${id}`, data); toast.success('Material updated'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to update material')); throw new Error('update failed'); }
  },
  deleteMaterial: async (id) => {
    try { await apiClient.delete(`/learning/materials/${id}`); toast.success('Material deleted'); set((s) => ({ materials: s.materials.filter((m) => m.id !== id) })); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to delete material')); }
  },
  recordDownload: async (id) => {
    try { await apiClient.post(`/learning/materials/${id}/download`); set((s) => ({ materials: s.materials.map((m) => m.id === id ? { ...m, downloads: m.downloads + 1 } : m) })); }
    catch { console.error('Failed to record download'); }
  },

  fetchQuizzes: async (params) => {
    set({ quizzesLoading: true });
    try {
      const res = await apiClient.get('/learning/quizzes', { params });
      const raw = res.data.data ?? res.data;
      const arr = unwrapList<Quiz>(raw);
      set({ quizzes: arr.map(mapId), quizzesTotal: extractTotal(raw, arr.length) });
    } catch { console.error('Failed to fetch quizzes'); }
    finally { set({ quizzesLoading: false }); }
  },
  createQuiz: async (data) => {
    try { await apiClient.post('/learning/quizzes', data); toast.success('Quiz created successfully'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to create quiz')); throw new Error('create failed'); }
  },
  updateQuiz: async (id, data) => {
    try { await apiClient.put(`/learning/quizzes/${id}`, data); toast.success('Quiz updated'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to update quiz')); throw new Error('update failed'); }
  },
  publishQuiz: async (id, status) => {
    try { await apiClient.patch(`/learning/quizzes/${id}/publish`, { status }); toast.success(`Quiz ${status === 'published' ? 'published' : 'closed'} successfully`); set((s) => ({ quizzes: s.quizzes.map((q) => (q.id === id ? { ...q, status } : q)) })); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to update quiz status')); }
  },
  deleteQuiz: async (id) => {
    try { await apiClient.delete(`/learning/quizzes/${id}`); toast.success('Quiz deleted'); set((s) => ({ quizzes: s.quizzes.filter((q) => q.id !== id) })); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to delete quiz')); }
  },
  fetchQuizResults: async (quizId) => {
    set({ quizResultsLoading: true });
    try {
      const res = await apiClient.get(`/learning/quizzes/${quizId}/results`);
      const raw = res.data.data ?? res.data;
      set({ quizResults: { attempts: Array.isArray(raw.attempts) ? raw.attempts.map(mapId) : [], averageScore: Number(raw.averageScore ?? 0), submissionCount: Number(raw.submissionCount ?? 0) } });
    } catch { console.error('Failed to fetch quiz results'); }
    finally { set({ quizResultsLoading: false }); }
  },
  submitQuizAttempt: async (quizId, answers, startedAt) => {
    try {
      const res = await apiClient.post(`/learning/quizzes/${quizId}/attempt`, { answers, startedAt });
      const raw = res.data.data ?? res.data;
      toast.success('Quiz submitted!');
      return mapId(raw as QuizAttempt);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to submit quiz');
      toast.error(msg); throw new Error(msg);
    }
  },

  fetchRubrics: async (params) => {
    set({ rubricsLoading: true });
    try {
      const res = await apiClient.get('/learning/rubrics', { params });
      const raw = res.data.data ?? res.data;
      const arr = unwrapList<Rubric>(raw);
      set({ rubrics: arr.map(mapId), rubricsTotal: extractTotal(raw, arr.length) });
    } catch { console.error('Failed to fetch rubrics'); }
    finally { set({ rubricsLoading: false }); }
  },
  createRubric: async (data) => {
    try { await apiClient.post('/learning/rubrics', data); toast.success('Rubric created successfully'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to create rubric')); throw new Error('create failed'); }
  },
  updateRubric: async (id, data) => {
    try { await apiClient.put(`/learning/rubrics/${id}`, data); toast.success('Rubric updated'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to update rubric')); throw new Error('update failed'); }
  },
  deleteRubric: async (id) => {
    try { await apiClient.delete(`/learning/rubrics/${id}`); toast.success('Rubric deleted'); set((s) => ({ rubrics: s.rubrics.filter((r) => r.id !== id) })); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to delete rubric')); }
  },

  fetchSubmissions: async (homeworkId, params) => {
    set({ submissionsLoading: true });
    try {
      const res = await apiClient.get(`/learning/assignments/${homeworkId}/submissions`, { params });
      const raw = res.data.data ?? res.data;
      const arr = unwrapList<AssignmentSubmission>(raw);
      set({ submissions: arr.map(mapId), submissionsTotal: extractTotal(raw, arr.length) });
    } catch { console.error('Failed to fetch submissions'); }
    finally { set({ submissionsLoading: false }); }
  },
  saveDraft: async (homeworkId, files) => {
    try { await apiClient.post(`/learning/assignments/${homeworkId}/draft`, { files }); toast.success('Draft saved'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to save draft')); }
  },
  submitFinal: async (homeworkId, files) => {
    try { await apiClient.post(`/learning/assignments/${homeworkId}/submit`, { files }); toast.success('Assignment submitted'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to submit assignment')); }
  },
  gradeSubmission: async (id, data) => {
    try { await apiClient.post(`/learning/submissions/${id}/grade`, data); toast.success('Submission graded'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to grade submission')); }
  },
  requestRevision: async (id) => {
    try { await apiClient.post(`/learning/submissions/${id}/request-revision`); toast.success('Revision requested'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to request revision')); }
  },
  enablePeerReview: async (homeworkId) => {
    try { await apiClient.post(`/learning/assignments/${homeworkId}/peer-review`); toast.success('Peer review enabled'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to enable peer review')); }
  },
  submitPeerReview: async (id, rating, comments) => {
    try { await apiClient.post(`/learning/submissions/${id}/peer-review`, { rating, comments }); toast.success('Peer review submitted'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to submit peer review')); }
  },

  fetchStudentProgress: async (studentId, subjectId) => {
    set({ progressLoading: true });
    try {
      const params: Record<string, string> = {};
      if (subjectId) params.subjectId = subjectId;
      const res = await apiClient.get(`/learning/progress/${studentId}`, { params });
      const raw = res.data.data ?? res.data;
      set({ studentProgress: (Array.isArray(raw) ? raw : []).map(mapId) as StudentProgress[] });
    } catch { console.error('Failed to fetch student progress'); }
    finally { set({ progressLoading: false }); }
  },
  calculateMastery: async (studentId, subjectId, params) => {
    try { await apiClient.post(`/learning/progress/${studentId}/${subjectId}/mastery`, null, { params }); toast.success('Mastery recalculated'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to calculate mastery')); }
  },
  fetchStrugglingStudents: async (classId) => {
    set({ strugglingLoading: true });
    try {
      const res = await apiClient.get(`/learning/struggling/${classId}`);
      const raw = res.data.data ?? res.data;
      set({ strugglingStudents: (Array.isArray(raw) ? raw : []) as StrugglingStudent[] });
    } catch { console.error('Failed to fetch struggling students'); }
    finally { set({ strugglingLoading: false }); }
  },
}));
