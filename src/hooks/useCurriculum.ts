import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  CurriculumFramework,
  CurriculumTopic,
  CurriculumCoverage,
  CoverageReport,
  SchoolClass,
  Subject,
} from '@/types';

interface CreateFrameworkData {
  name: string;
  subjectId: string;
  gradeId: string;
  term: number;
  year: number;
}

interface CreateTopicData {
  frameworkId: string;
  title: string;
  description?: string;
  cognitiveLevel: string;
  estimatedHours: number;
  order: number;
  parentTopicId?: string;
  term?: number;
}

interface UpdateCoverageData {
  classId: string;
  status: string;
  dateCovered: string | null;
  notes: string;
  linkedLessonPlanId: string | null;
}

interface BulkImportData {
  frameworkId: string;
  topics: Partial<CurriculumTopic>[];
}

export function useCurriculum() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [frameworks, setFrameworks] = useState<CurriculumFramework[]>([]);
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [coverage, setCoverage] = useState<Map<string, CurriculumCoverage>>(new Map());
  const [coverageReport, setCoverageReport] = useState<CoverageReport[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');

  const fetchFrameworks = useCallback(async () => {
    try {
      const res = await apiClient.get('/teacher-workbench/curriculum/frameworks', {
        params: { schoolId },
      });
      setFrameworks(unwrapList<CurriculumFramework>(res));
    } catch (err: unknown) {
      console.error('Failed to load frameworks', extractErrorMessage(err));
    }
  }, [schoolId]);

  const fetchTopics = useCallback(async () => {
    try {
      const res = await apiClient.get('/teacher-workbench/curriculum/topics', {
        params: {
          schoolId,
          frameworkId: selectedFramework || undefined,
          subjectId: selectedSubject || undefined,
          gradeLevel: selectedGrade || undefined,
        },
      });
      setTopics(unwrapList<CurriculumTopic>(res));
    } catch (err: unknown) {
      console.error('Failed to load topics', extractErrorMessage(err));
    }
  }, [schoolId, selectedFramework, selectedSubject, selectedGrade]);

  const fetchCoverage = useCallback(async () => {
    if (!selectedClass || !selectedSubject) return;
    try {
      const res = await apiClient.get('/teacher-workbench/curriculum/coverage', {
        params: {
          schoolId,
          teacherId: user?.id,
          classId: selectedClass,
          subjectId: selectedSubject,
        },
      });
      const list = unwrapList<CurriculumCoverage>(res);
      const map = new Map<string, CurriculumCoverage>();
      for (const c of list) {
        map.set(c.topicId, c);
      }
      setCoverage(map);
    } catch (err: unknown) {
      console.error('Failed to load coverage', extractErrorMessage(err));
    }
  }, [schoolId, user?.id, selectedClass, selectedSubject]);

  const fetchCoverageReport = useCallback(async () => {
    if (!selectedClass || !selectedSubject) return;
    try {
      const res = await apiClient.get('/teacher-workbench/curriculum/coverage/report', {
        params: {
          schoolId,
          teacherId: user?.id,
          classId: selectedClass,
          subjectId: selectedSubject,
        },
      });
      setCoverageReport(unwrapList<CoverageReport>(res));
    } catch (err: unknown) {
      console.error('Failed to load coverage report', extractErrorMessage(err));
    }
  }, [schoolId, user?.id, selectedClass, selectedSubject]);

  useEffect(() => {
    async function init() {
      try {
        const [classesRes, subjectsRes] = await Promise.allSettled([
          apiClient.get('/academic/classes'),
          apiClient.get('/academic/subjects'),
        ]);
        if (classesRes.status === 'fulfilled') {
          setClasses(unwrapList<SchoolClass>(classesRes.value));
        }
        if (subjectsRes.status === 'fulfilled') {
          setSubjects(unwrapList<Subject>(subjectsRes.value));
        }
        await fetchFrameworks();
      } catch (err: unknown) {
        console.error('Failed to initialise curriculum', extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [fetchFrameworks]);

  useEffect(() => {
    void fetchTopics();
  }, [fetchTopics]);

  useEffect(() => {
    void fetchCoverage();
    void fetchCoverageReport();
  }, [fetchCoverage, fetchCoverageReport]);

  const createFramework = useCallback(
    async (data: CreateFrameworkData) => {
      try {
        await apiClient.post('/teacher-workbench/curriculum/frameworks', {
          ...data,
          schoolId,
        });
        toast.success('Framework created');
        await fetchFrameworks();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to create framework'));
      }
    },
    [schoolId, fetchFrameworks],
  );

  const createTopic = useCallback(
    async (data: CreateTopicData) => {
      try {
        await apiClient.post('/teacher-workbench/curriculum/topics', data);
        toast.success('Topic created');
        await fetchTopics();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to create topic'));
      }
    },
    [fetchTopics],
  );

  const updateTopic = useCallback(
    async (id: string, data: Partial<CreateTopicData>) => {
      try {
        await apiClient.put(`/teacher-workbench/curriculum/topics/${id}`, data);
        toast.success('Topic updated');
        await fetchTopics();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to update topic'));
      }
    },
    [fetchTopics],
  );

  const deleteTopic = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/teacher-workbench/curriculum/topics/${id}`);
        toast.success('Topic deleted');
        await fetchTopics();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to delete topic'));
      }
    },
    [fetchTopics],
  );

  const bulkImportTopics = useCallback(
    async (data: BulkImportData) => {
      try {
        await apiClient.post('/teacher-workbench/curriculum/topics/bulk', data);
        toast.success('Topics imported');
        await fetchTopics();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to import topics'));
      }
    },
    [fetchTopics],
  );

  const updateCoverage = useCallback(
    async (topicId: string, data: UpdateCoverageData) => {
      try {
        await apiClient.patch(`/teacher-workbench/curriculum/coverage/${topicId}`, {
          ...data,
          schoolId,
        });
        toast.success('Coverage updated');
        await fetchCoverage();
        await fetchCoverageReport();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to update coverage'));
      }
    },
    [schoolId, fetchCoverage, fetchCoverageReport],
  );

  return {
    frameworks,
    topics,
    coverage,
    coverageReport,
    classes,
    subjects,
    loading,
    selectedFramework,
    setSelectedFramework,
    selectedSubject,
    setSelectedSubject,
    selectedGrade,
    setSelectedGrade,
    selectedClass,
    setSelectedClass,
    fetchFrameworks,
    fetchTopics,
    fetchCoverage,
    fetchCoverageReport,
    createFramework,
    createTopic,
    updateTopic,
    deleteTopic,
    bulkImportTopics,
    updateCoverage,
  };
}

export type { CreateFrameworkData, CreateTopicData, UpdateCoverageData, BulkImportData };
