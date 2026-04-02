import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  BankQuestion,
  QuestionFilters,
  CurriculumFramework,
  CurriculumTopic,
  Subject,
} from '@/types';

export function useQuestionBank() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [frameworks, setFrameworks] = useState<CurriculumFramework[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);

  const fetchQuestions = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = { schoolId, ...filters };
      const response = await apiClient.get('/teacher-workbench/questions', { params });
      const raw = response.data.data ?? response.data;
      if (Array.isArray(raw)) {
        setQuestions(raw as BankQuestion[]);
        setTotalCount(raw.length);
      } else if (typeof raw === 'object' && raw !== null) {
        const obj = raw as Record<string, unknown>;
        const arr = Array.isArray(obj.questions)
          ? (obj.questions as BankQuestion[])
          : unwrapList<BankQuestion>(response);
        setQuestions(arr);
        setTotalCount(typeof obj.total === 'number' ? obj.total : arr.length);
      }
    } catch (err: unknown) {
      console.error('Failed to load questions:', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [schoolId, filters]);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [fwRes, subRes] = await Promise.allSettled([
          apiClient.get('/teacher-workbench/curriculum/frameworks', { params: { schoolId } }),
          apiClient.get('/academic/subjects'),
        ]);
        if (fwRes.status === 'fulfilled') {
          setFrameworks(unwrapList<CurriculumFramework>(fwRes.value));
        }
        if (subRes.status === 'fulfilled') {
          setSubjects(unwrapList<Subject>(subRes.value));
        }
      } catch (err: unknown) {
        console.error('Failed to load question bank metadata', err);
      }
    }
    if (schoolId) fetchMeta();
  }, [schoolId]);

  useEffect(() => {
    const subjectId = filters.subjectId;
    const gradeId = filters.gradeId;
    if (!subjectId && !gradeId) {
      setTopics([]);
      return;
    }
    async function fetchTopics() {
      try {
        const params: Record<string, unknown> = {};
        if (subjectId) params.subjectId = subjectId;
        if (gradeId) params.gradeId = gradeId;
        const res = await apiClient.get('/teacher-workbench/curriculum/topics', { params });
        setTopics(unwrapList<CurriculumTopic>(res));
      } catch (err: unknown) {
        console.error('Failed to load topics', err);
      }
    }
    fetchTopics();
  }, [filters.subjectId, filters.gradeId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const createQuestion = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        await apiClient.post('/teacher-workbench/questions', { ...data, schoolId });
        toast.success('Question created');
        await fetchQuestions();
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to create question'));
        return false;
      }
    },
    [schoolId, fetchQuestions],
  );

  const updateQuestion = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      try {
        await apiClient.put(`/teacher-workbench/questions/${id}`, data);
        toast.success('Question updated');
        await fetchQuestions();
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to update question'));
        return false;
      }
    },
    [fetchQuestions],
  );

  const deleteQuestion = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/teacher-workbench/questions/${id}`);
        toast.success('Question deleted');
        await fetchQuestions();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to delete question'));
      }
    },
    [fetchQuestions],
  );

  const importFromPaper = useCallback(
    async (paperId: string, frameworkId: string) => {
      try {
        await apiClient.post(
          `/teacher-workbench/questions/import-from-paper/${paperId}`,
          { frameworkId },
        );
        toast.success('Questions imported from paper');
        await fetchQuestions();
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to import questions'));
        return false;
      }
    },
    [fetchQuestions],
  );

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post('/teacher-workbench/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = unwrapResponse(response) as { url: string };
    return data.url;
  }, []);

  return {
    questions,
    loading,
    totalCount,
    filters,
    setFilters,
    frameworks,
    subjects,
    topics,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    importFromPaper,
    uploadImage,
  };
}
