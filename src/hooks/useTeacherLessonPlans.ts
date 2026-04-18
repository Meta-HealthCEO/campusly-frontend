import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SchoolClass, Subject } from '@/types';

interface LessonPlan {
  _id: string;
  teacherId: string | { _id: string; firstName?: string; lastName?: string };
  schoolId: string;
  subjectId: string | { _id: string; name?: string; code?: string };
  classId: string | { _id: string; name?: string };
  curriculumTopicId?: string | { _id: string; title?: string };
  date: string;
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homework?: string;
  reflectionNotes?: string;
  aiGenerated?: boolean;
  createdAt: string;
}

interface LessonPlanFormData {
  classId: string;
  subjectId: string;
  curriculumTopicId?: string;
  date: string;
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homework?: string;
  reflectionNotes?: string;
  aiGenerated?: boolean;
}

interface AIGenerateInput {
  curriculumTopicId: string;
  classId: string;
  subjectId: string;
  date: string;
  durationMinutes?: number;
}

interface AIGeneratedDraft {
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homework?: string;
}

interface CurriculumTopicOption {
  _id: string;
  title: string;
  code?: string;
}

interface PaginatedPlans {
  data: LessonPlan[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_LIMIT = 20;

export function useTeacherLessonPlans() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterSubjectId, setFilterSubjectId] = useState<string>('');
  const [filterClassId, setFilterClassId] = useState<string>('');

  const [curriculumTopics, setCurriculumTopics] = useState<CurriculumTopicOption[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit };
      if (filterSubjectId) params.subjectId = filterSubjectId;
      if (filterClassId) params.classId = filterClassId;
      const res = await apiClient.get('/lesson-plans', { params });
      const payload = unwrapResponse<PaginatedPlans | LessonPlan[]>(res);
      if (Array.isArray(payload)) {
        setPlans(payload);
        setTotal(payload.length);
        setTotalPages(1);
      } else {
        setPlans(Array.isArray(payload.data) ? payload.data : []);
        setTotal(payload.total ?? 0);
        setTotalPages(payload.totalPages ?? 0);
      }
    } catch {
      toast.error('Failed to load lesson plans');
    }
  }, [page, limit, filterSubjectId, filterClassId]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [, classesRes, subjectsRes] = await Promise.allSettled([
          fetchPlans(),
          apiClient.get('/academic/classes'),
          apiClient.get('/academic/subjects'),
        ]);
        if (cancelled) return;
        if (classesRes.status === 'fulfilled') {
          setClasses(unwrapList<SchoolClass>(classesRes.value));
        }
        if (subjectsRes.status === 'fulfilled') {
          setSubjects(unwrapList<Subject>(subjectsRes.value));
        }
      } catch {
        if (!cancelled) toast.error('Failed to load lesson plan data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch plans when pagination or filters change (after initial mount).
  useEffect(() => {
    if (loading) return;
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterSubjectId, filterClassId]);

  const fetchPlan = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/lesson-plans/${id}`);
      const plan = unwrapResponse<LessonPlan>(res);
      setSelectedPlan(plan);
    } catch {
      toast.error('Failed to load lesson plan details');
    }
  }, []);

  const loadTopicsForSubject = useCallback(async (subjectId: string) => {
    if (!subjectId) {
      setCurriculumTopics([]);
      return;
    }
    setTopicsLoading(true);
    try {
      const res = await apiClient.get('/curriculum-structure/nodes', {
        params: { type: 'topic', subjectId },
      });
      setCurriculumTopics(unwrapList<CurriculumTopicOption>(res));
    } catch {
      setCurriculumTopics([]);
      toast.error('Could not load curriculum topics');
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  const createPlan = useCallback(
    async (data: LessonPlanFormData) => {
      try {
        await apiClient.post('/lesson-plans', {
          ...data,
          schoolId: user?.schoolId,
        });
        toast.success('Lesson plan created');
        await fetchPlans();
        return true;
      } catch {
        toast.error('Failed to create lesson plan');
        return false;
      }
    },
    [user?.schoolId, fetchPlans],
  );

  const updatePlan = useCallback(
    async (id: string, data: Partial<LessonPlanFormData>) => {
      try {
        await apiClient.put(`/lesson-plans/${id}`, data);
        toast.success('Lesson plan updated');
        await fetchPlans();
        return true;
      } catch {
        toast.error('Failed to update lesson plan');
        return false;
      }
    },
    [fetchPlans],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/lesson-plans/${id}`);
        toast.success('Lesson plan deleted');
        await fetchPlans();
      } catch {
        toast.error('Failed to delete lesson plan');
      }
    },
    [fetchPlans],
  );

  const aiGenerate = useCallback(
    async (input: AIGenerateInput): Promise<AIGeneratedDraft | null> => {
      if (!user?.schoolId) {
        toast.error('School information not available');
        return null;
      }
      setAiGenerating(true);
      try {
        const res = await apiClient.post('/lesson-plans/ai-generate', {
          ...input,
          schoolId: user.schoolId,
          date: new Date(input.date).toISOString(),
        });
        const draft = unwrapResponse<AIGeneratedDraft>(res);
        toast.success('Draft generated — review and save');
        return draft;
      } catch {
        toast.error('AI generation failed. Please try again.');
        return null;
      } finally {
        setAiGenerating(false);
      }
    },
    [user?.schoolId],
  );

  return {
    plans,
    classes,
    subjects,
    loading,
    selectedPlan,
    setSelectedPlan,
    fetchPlan,
    createPlan,
    updatePlan,
    deletePlan,
    aiGenerate,
    aiGenerating,
    // Pagination + filters
    page,
    setPage,
    limit,
    total,
    totalPages,
    filterSubjectId,
    setFilterSubjectId,
    filterClassId,
    setFilterClassId,
    // Curriculum topics
    curriculumTopics,
    topicsLoading,
    loadTopicsForSubject,
  };
}

export type {
  LessonPlan,
  LessonPlanFormData,
  AIGenerateInput,
  AIGeneratedDraft,
  CurriculumTopicOption,
};
