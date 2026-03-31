import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SchoolClass, Subject } from '@/types';

interface LessonPlan {
  _id: string;
  teacherId: string | { _id: string; firstName?: string; lastName?: string };
  schoolId: string;
  subjectId: string | { _id: string; name?: string; code?: string };
  classId: string | { _id: string; name?: string };
  date: string;
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homework?: string;
  reflectionNotes?: string;
  createdAt: string;
}

interface LessonPlanFormData {
  classId: string;
  subjectId: string;
  date: string;
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homework?: string;
  reflectionNotes?: string;
}

export function useTeacherLessonPlans() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiClient.get('/attendance/lesson-plans', {
        params: { schoolId: user?.schoolId },
      });
      setPlans(unwrapList<LessonPlan>(res));
    } catch {
      console.error('Failed to load lesson plans');
    }
  }, [user?.schoolId]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [, classesRes, subjectsRes] = await Promise.allSettled([
          fetchPlans(),
          apiClient.get('/academic/classes'),
          apiClient.get('/academic/subjects'),
        ]);
        if (classesRes.status === 'fulfilled') {
          setClasses(unwrapList<SchoolClass>(classesRes.value));
        }
        if (subjectsRes.status === 'fulfilled') {
          setSubjects(unwrapList<Subject>(subjectsRes.value));
        }
      } catch {
        console.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [fetchPlans]);

  const createPlan = useCallback(
    async (data: LessonPlanFormData) => {
      try {
        await apiClient.post('/attendance/lesson-plans', {
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

  const deletePlan = useCallback(
    async (id: string) => {
      try {
        await apiClient.delete(`/attendance/lesson-plans/${id}`);
        toast.success('Lesson plan deleted');
        await fetchPlans();
      } catch {
        toast.error('Failed to delete lesson plan');
      }
    },
    [fetchPlans],
  );

  return { plans, classes, subjects, loading, createPlan, deletePlan };
}

export type { LessonPlan, LessonPlanFormData };
