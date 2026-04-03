import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  AttemptPayload,
  AttemptResult,
  StudentMasteryItem,
  StudentResourceFilters,
  ContentResourceItem,
} from '@/types';

interface StudentLearningResult {
  resources: ContentResourceItem[];
  total: number;
  loading: boolean;
  mastery: StudentMasteryItem[];
  masteryLoading: boolean;
  fetchApprovedResources: (filters?: StudentResourceFilters) => Promise<void>;
  getResource: (id: string) => Promise<ContentResourceItem>;
  submitAttempt: (resourceId: string, studentId: string, data: AttemptPayload) => Promise<AttemptResult>;
  fetchMyMastery: (
    studentId: string,
    filters?: Pick<StudentResourceFilters, 'subjectId' | 'gradeId'>,
  ) => Promise<void>;
}

export function useStudentLearning(): StudentLearningResult {
  const [resources, setResources] = useState<ContentResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mastery, setMastery] = useState<StudentMasteryItem[]>([]);
  const [masteryLoading, setMasteryLoading] = useState(false);

  const fetchApprovedResources = useCallback(
    async (filters?: StudentResourceFilters) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {};
        if (filters?.subjectId) params.subjectId = filters.subjectId;
        if (filters?.gradeId) params.gradeId = filters.gradeId;
        if (filters?.term) params.term = filters.term;
        if (filters?.search) params.search = filters.search;
        if (filters?.page) params.page = filters.page;
        if (filters?.limit) params.limit = filters.limit;

        const res = await apiClient.get('/content-library/student/resources', { params });
        const raw = res.data.data ?? res.data;

        if (Array.isArray(raw)) {
          setResources(raw as ContentResourceItem[]);
          setTotal(raw.length);
        } else if (typeof raw === 'object' && raw !== null) {
          const obj = raw as Record<string, unknown>;
          const items = Array.isArray(obj.resources)
            ? (obj.resources as ContentResourceItem[])
            : unwrapList<ContentResourceItem>(res);
          setResources(items);
          setTotal(typeof obj.total === 'number' ? obj.total : items.length);
        } else {
          setResources([]);
          setTotal(0);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch approved resources', err);
        toast.error('Failed to load resources');
        setResources([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getResource = useCallback(async (id: string): Promise<ContentResourceItem> => {
    const res = await apiClient.get(`/content-library/student/resources/${id}`);
    return unwrapResponse<ContentResourceItem>(res);
  }, []);

  const submitAttempt = useCallback(
    async (resourceId: string, studentId: string, data: AttemptPayload): Promise<AttemptResult> => {
      const res = await apiClient.post(
        `/content-library/student/resources/${resourceId}/attempt`,
        data,
        { params: { studentId } },
      );
      return unwrapResponse<AttemptResult>(res);
    },
    [],
  );

  const fetchMyMastery = useCallback(
    async (
      studentId: string,
      filters?: Pick<StudentResourceFilters, 'subjectId' | 'gradeId'>,
    ) => {
      setMasteryLoading(true);
      try {
        const params: Record<string, string> = { studentId };
        if (filters?.subjectId) params.subjectId = filters.subjectId;
        if (filters?.gradeId) params.gradeId = filters.gradeId;

        const res = await apiClient.get('/content-library/student/mastery', { params });
        const raw = res.data?.data ?? res.data;
        const items: StudentMasteryItem[] = Array.isArray(raw)
          ? raw
          : ((raw as Record<string, unknown>)?.records as StudentMasteryItem[] ?? []);
        setMastery(items);
      } catch (err: unknown) {
        console.error('Failed to fetch mastery data', err);
        toast.error('Failed to load mastery data');
        setMastery([]);
      } finally {
        setMasteryLoading(false);
      }
    },
    [],
  );

  return {
    resources,
    total,
    loading,
    mastery,
    masteryLoading,
    fetchApprovedResources,
    getResource,
    submitAttempt,
    fetchMyMastery,
  };
}
