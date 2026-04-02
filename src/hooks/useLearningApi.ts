import { useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { unwrapList, mapId, extractTotal, extractErrorMessage } from '@/lib/learningHelpers';
import { useLearningStore } from '@/stores/useLearningStore';
import type {
  Quiz, StudyMaterial, Rubric, QuizAttempt, QuizLeaderboardEntry,
  AssignmentSubmission, StudentProgress, StrugglingStudent,
  CreateQuizInput, CreateMaterialInput, CreateRubricInput, GradeSubmissionInput,
  QuizAnswer,
} from '@/components/learning/types';

export function useLearningApi() {
  const setMaterials = useLearningStore((s) => s.setMaterials);
  const setMaterialsLoading = useLearningStore((s) => s.setMaterialsLoading);
  const removeMaterial = useLearningStore((s) => s.removeMaterial);
  const incrementDownload = useLearningStore((s) => s.incrementDownload);
  const setQuizzes = useLearningStore((s) => s.setQuizzes);
  const setQuizzesLoading = useLearningStore((s) => s.setQuizzesLoading);
  const updateQuizStatus = useLearningStore((s) => s.updateQuizStatus);
  const removeQuiz = useLearningStore((s) => s.removeQuiz);
  const setQuizResults = useLearningStore((s) => s.setQuizResults);
  const setQuizResultsLoading = useLearningStore((s) => s.setQuizResultsLoading);
  const setRubrics = useLearningStore((s) => s.setRubrics);
  const setRubricsLoading = useLearningStore((s) => s.setRubricsLoading);
  const removeRubricFromStore = useLearningStore((s) => s.removeRubric);
  const setSubmissions = useLearningStore((s) => s.setSubmissions);
  const setSubmissionsLoading = useLearningStore((s) => s.setSubmissionsLoading);
  const setStudentProgress = useLearningStore((s) => s.setStudentProgress);
  const setProgressLoading = useLearningStore((s) => s.setProgressLoading);
  const setStrugglingStudents = useLearningStore((s) => s.setStrugglingStudents);
  const setStrugglingLoading = useLearningStore((s) => s.setStrugglingLoading);

  // --- Materials ---

  const fetchMaterials = useCallback(async (params?: Record<string, string>) => {
    setMaterialsLoading(true);
    try {
      const res = await apiClient.get('/learning/materials', { params });
      const raw = unwrapResponse(res);
      const arr = unwrapList<StudyMaterial>(raw);
      setMaterials(arr.map(mapId), extractTotal(raw, arr.length));
    } catch {
      console.error('Failed to fetch materials');
    } finally {
      setMaterialsLoading(false);
    }
  }, [setMaterials, setMaterialsLoading]);

  const uploadMaterial = useCallback(async (data: CreateMaterialInput) => {
    try {
      await apiClient.post('/learning/materials', data);
      toast.success('Material uploaded successfully');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to upload material'));
      throw new Error('upload failed');
    }
  }, []);

  const updateMaterial = useCallback(async (id: string, data: Partial<CreateMaterialInput>) => {
    try {
      await apiClient.put(`/learning/materials/${id}`, data);
      toast.success('Material updated');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update material'));
      throw new Error('update failed');
    }
  }, []);

  const deleteMaterial = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/learning/materials/${id}`);
      toast.success('Material deleted');
      removeMaterial(id);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete material'));
    }
  }, [removeMaterial]);

  const recordDownload = useCallback(async (id: string) => {
    try {
      await apiClient.post(`/learning/materials/${id}/download`);
      incrementDownload(id);
    } catch {
      console.error('Failed to record download');
    }
  }, [incrementDownload]);

  // --- Quizzes ---

  const fetchQuizzes = useCallback(async (params?: Record<string, string>) => {
    setQuizzesLoading(true);
    try {
      const res = await apiClient.get('/learning/quizzes', { params });
      const raw = unwrapResponse(res);
      const arr = unwrapList<Quiz>(raw);
      setQuizzes(arr.map(mapId), extractTotal(raw, arr.length));
    } catch {
      console.error('Failed to fetch quizzes');
    } finally {
      setQuizzesLoading(false);
    }
  }, [setQuizzes, setQuizzesLoading]);

  const createQuiz = useCallback(async (data: CreateQuizInput) => {
    try {
      await apiClient.post('/learning/quizzes', data);
      toast.success('Quiz created successfully');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create quiz'));
      throw new Error('create failed');
    }
  }, []);

  const updateQuiz = useCallback(async (id: string, data: Partial<CreateQuizInput>) => {
    try {
      await apiClient.put(`/learning/quizzes/${id}`, data);
      toast.success('Quiz updated');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update quiz'));
      throw new Error('update failed');
    }
  }, []);

  const publishQuiz = useCallback(async (id: string, status: 'published' | 'closed') => {
    try {
      await apiClient.patch(`/learning/quizzes/${id}/publish`, { status });
      toast.success(`Quiz ${status === 'published' ? 'published' : 'closed'} successfully`);
      updateQuizStatus(id, status);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update quiz status'));
    }
  }, [updateQuizStatus]);

  const deleteQuiz = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/learning/quizzes/${id}`);
      toast.success('Quiz deleted');
      removeQuiz(id);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete quiz'));
    }
  }, [removeQuiz]);

  const fetchQuizResults = useCallback(async (quizId: string) => {
    setQuizResultsLoading(true);
    try {
      const res = await apiClient.get(`/learning/quizzes/${quizId}/results`);
      const raw = unwrapResponse(res);
      setQuizResults({
        attempts: Array.isArray(raw.attempts) ? raw.attempts.map(mapId) : [],
        averageScore: Number(raw.averageScore ?? 0),
        submissionCount: Number(raw.submissionCount ?? 0),
      });
    } catch {
      console.error('Failed to fetch quiz results');
    } finally {
      setQuizResultsLoading(false);
    }
  }, [setQuizResults, setQuizResultsLoading]);

  const startQuizAttempt = useCallback(async (quizId: string): Promise<{ quiz: Quiz; attemptNumber: number }> => {
    try {
      const res = await apiClient.post(`/learning/quizzes/${quizId}/start`);
      const raw = unwrapResponse(res);
      const quiz = raw.quiz as Record<string, unknown>;
      return {
        quiz: { ...quiz, id: (quiz._id as string) ?? (quiz.id as string) } as unknown as Quiz,
        attemptNumber: Number(raw.attemptNumber ?? 1),
      };
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to start quiz');
      toast.error(msg);
      throw new Error(msg);
    }
  }, []);

  const submitQuizAttempt = useCallback(async (
    quizId: string, answers: QuizAnswer[], startedAt: string, timeSpent?: number,
  ): Promise<QuizAttempt> => {
    try {
      const res = await apiClient.post(`/learning/quizzes/${quizId}/attempt`, { answers, startedAt, timeSpent });
      toast.success('Quiz submitted!');
      return mapId(unwrapResponse(res) as QuizAttempt);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to submit quiz');
      toast.error(msg);
      throw new Error(msg);
    }
  }, []);

  const fetchQuizLeaderboard = useCallback(async (quizId: string): Promise<QuizLeaderboardEntry[]> => {
    try {
      const res = await apiClient.get(`/learning/quizzes/${quizId}/leaderboard`);
      const raw = unwrapResponse(res);
      return Array.isArray(raw) ? raw as QuizLeaderboardEntry[] : [];
    } catch {
      console.error('Failed to fetch quiz leaderboard');
      return [];
    }
  }, []);

  // --- Rubrics ---

  const fetchRubrics = useCallback(async (params?: Record<string, string>) => {
    setRubricsLoading(true);
    try {
      const res = await apiClient.get('/learning/rubrics', { params });
      const raw = unwrapResponse(res);
      const arr = unwrapList<Rubric>(raw);
      setRubrics(arr.map(mapId), extractTotal(raw, arr.length));
    } catch {
      console.error('Failed to fetch rubrics');
    } finally {
      setRubricsLoading(false);
    }
  }, [setRubrics, setRubricsLoading]);

  const createRubric = useCallback(async (data: CreateRubricInput) => {
    try {
      await apiClient.post('/learning/rubrics', data);
      toast.success('Rubric created successfully');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create rubric'));
      throw new Error('create failed');
    }
  }, []);

  const updateRubric = useCallback(async (id: string, data: Partial<CreateRubricInput>) => {
    try {
      await apiClient.put(`/learning/rubrics/${id}`, data);
      toast.success('Rubric updated');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update rubric'));
      throw new Error('update failed');
    }
  }, []);

  const deleteRubric = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/learning/rubrics/${id}`);
      toast.success('Rubric deleted');
      removeRubricFromStore(id);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete rubric'));
    }
  }, [removeRubricFromStore]);

  // --- Submissions ---

  const fetchSubmissions = useCallback(async (homeworkId: string, params?: Record<string, string>) => {
    setSubmissionsLoading(true);
    try {
      const res = await apiClient.get(`/learning/assignments/${homeworkId}/submissions`, { params });
      const raw = unwrapResponse(res);
      const arr = unwrapList<AssignmentSubmission>(raw);
      setSubmissions(arr.map(mapId), extractTotal(raw, arr.length));
    } catch {
      console.error('Failed to fetch submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  }, [setSubmissions, setSubmissionsLoading]);

  const saveDraft = useCallback(async (homeworkId: string, files: string[]) => {
    try { await apiClient.post(`/learning/assignments/${homeworkId}/draft`, { files }); toast.success('Draft saved'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to save draft')); }
  }, []);

  const submitFinal = useCallback(async (homeworkId: string, files: string[]) => {
    try { await apiClient.post(`/learning/assignments/${homeworkId}/submit`, { files }); toast.success('Assignment submitted'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to submit assignment')); }
  }, []);

  const gradeSubmission = useCallback(async (id: string, data: GradeSubmissionInput) => {
    try { await apiClient.post(`/learning/submissions/${id}/grade`, data); toast.success('Submission graded'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to grade submission')); }
  }, []);

  const requestRevision = useCallback(async (id: string) => {
    try { await apiClient.post(`/learning/submissions/${id}/request-revision`); toast.success('Revision requested'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to request revision')); }
  }, []);

  const enablePeerReview = useCallback(async (homeworkId: string) => {
    try { await apiClient.post(`/learning/assignments/${homeworkId}/peer-review`); toast.success('Peer review enabled'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to enable peer review')); }
  }, []);

  const submitPeerReview = useCallback(async (id: string, rating: number, comments: string) => {
    try { await apiClient.post(`/learning/submissions/${id}/peer-review`, { rating, comments }); toast.success('Peer review submitted'); }
    catch (err: unknown) { toast.error(extractErrorMessage(err, 'Failed to submit peer review')); }
  }, []);

  // --- Progress ---

  const fetchStudentProgress = useCallback(async (studentId: string, subjectId?: string) => {
    setProgressLoading(true);
    try {
      const params: Record<string, string> = {};
      if (subjectId) params.subjectId = subjectId;
      const res = await apiClient.get(`/learning/progress/${studentId}`, { params });
      const raw = unwrapResponse(res);
      setStudentProgress(
        (Array.isArray(raw) ? raw : []).map(mapId) as StudentProgress[],
      );
    } catch {
      console.error('Failed to fetch student progress');
    } finally {
      setProgressLoading(false);
    }
  }, [setStudentProgress, setProgressLoading]);

  const calculateMastery = useCallback(
    async (studentId: string, subjectId: string, params?: Record<string, string>) => {
      try {
        await apiClient.post(`/learning/progress/${studentId}/${subjectId}/mastery`, null, { params });
        toast.success('Mastery recalculated');
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to calculate mastery'));
      }
    }, [],
  );

  const fetchStrugglingStudents = useCallback(async (classId: string) => {
    setStrugglingLoading(true);
    try {
      const res = await apiClient.get(`/learning/struggling/${classId}`);
      const raw = unwrapResponse(res);
      setStrugglingStudents((Array.isArray(raw) ? raw : []) as StrugglingStudent[]);
    } catch {
      console.error('Failed to fetch struggling students');
    } finally {
      setStrugglingLoading(false);
    }
  }, [setStrugglingStudents, setStrugglingLoading]);

  return {
    fetchMaterials, uploadMaterial, updateMaterial, deleteMaterial, recordDownload,
    fetchQuizzes, createQuiz, updateQuiz, publishQuiz, deleteQuiz,
    fetchQuizResults, startQuizAttempt, submitQuizAttempt, fetchQuizLeaderboard,
    fetchRubrics, createRubric, updateRubric, deleteRubric,
    fetchSubmissions, saveDraft, submitFinal,
    gradeSubmission, requestRevision, enablePeerReview, submitPeerReview,
    fetchStudentProgress, calculateMastery, fetchStrugglingStudents,
  };
}
