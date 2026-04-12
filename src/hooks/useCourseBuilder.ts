import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { useUnsavedChanges } from './useUnsavedChanges';
import type {
  CourseTree,
  Course,
  CourseModule,
  CourseLesson,
} from '@/types';

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  subjectId?: string | null;
  gradeLevel?: number | null;
  tags?: string[];
  estimatedDurationHours?: number | null;
  passMarkPercent?: number;
  certificateEnabled?: boolean;
}

/**
 * Shape of the body accepted by POST /api/courses/:id/lessons, per the
 * backend's discriminatedUnion. Use the exact type that matches the
 * lesson the teacher picked from the resource picker.
 */
type LessonBase = {
  moduleId: string;
  orderIndex?: number;
  title: string;
  isRequiredToAdvance?: boolean;
  passMarkPercent?: number;
  maxAttempts?: number | null;
};
export type CreateLessonInput = LessonBase & (
  | { type: 'content'; contentResourceId: string }
  | { type: 'chapter'; textbookId: string; chapterId: string }
  | { type: 'homework'; homeworkId: string }
  | { type: 'quiz'; quizQuestionIds: string[]; isGraded?: boolean }
);

export interface UpdateLessonInput {
  title?: string;
  orderIndex?: number;
  isRequiredToAdvance?: boolean;
  passMarkPercent?: number;
  maxAttempts?: number | null;
}

/**
 * Hook for the course builder page. Fetches one course with its full
 * module + lesson tree and provides mutations for every structural
 * edit.
 */
export function useCourseBuilder(courseId: string) {
  const [course, setCourse] = useState<CourseTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get(`/courses/${courseId}`);
      setCourse(unwrapResponse<CourseTree>(res));
    } catch (err: unknown) {
      console.error('Failed to load course', err);
      toast.error(extractErrorMessage(err, 'Could not load course. Please refresh.'));
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void fetchCourse();
  }, [fetchCourse]);

  // beforeunload warning when the builder has in-flight mutations we
  // haven't confirmed yet. Most mutations are synchronous save-on-blur,
  // but the dirty flag catches the window where a teacher has made
  // changes that haven't finished round-tripping.
  useUnsavedChanges(isDirty, 'You have unsaved course changes. Are you sure you want to leave?');

  // ─── Course metadata ─────────────────────────────────────────────────

  const updateCourse = useCallback(async (data: UpdateCourseInput): Promise<boolean> => {
    setIsDirty(true);
    try {
      const res = await apiClient.put(`/courses/${courseId}`, data);
      const updated = unwrapResponse<Course>(res);
      setCourse((prev) => (prev ? { ...prev, ...updated } : prev));
      setIsDirty(false);
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update course'));
      return false;
    }
  }, [courseId]);

  // ─── Modules ─────────────────────────────────────────────────────────

  const addModule = useCallback(async (title: string): Promise<CourseModule | null> => {
    if (!course) return null;
    setIsDirty(true);
    try {
      const orderIndex = course.modules.length;
      const res = await apiClient.post(`/courses/${courseId}/modules`, { title, orderIndex });
      const created = unwrapResponse<CourseModule>(res);
      setCourse((prev) => (prev ? { ...prev, modules: [...prev.modules, { ...created, lessons: [] }] } : prev));
      setIsDirty(false);
      toast.success('Module added');
      return created;
    } catch (err: unknown) {
      setIsDirty(false);
      toast.error(extractErrorMessage(err, 'Failed to add module'));
      return null;
    }
  }, [course, courseId]);

  const updateModule = useCallback(async (moduleId: string, data: { title?: string; orderIndex?: number }): Promise<boolean> => {
    setIsDirty(true);
    try {
      const res = await apiClient.put(`/courses/${courseId}/modules/${moduleId}`, data);
      const updated = unwrapResponse<CourseModule>(res);
      setCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map((m) => (m.id === moduleId ? { ...m, ...updated } : m)),
        };
      });
      setIsDirty(false);
      return true;
    } catch (err: unknown) {
      setIsDirty(false);
      toast.error(extractErrorMessage(err, 'Failed to update module'));
      return false;
    }
  }, [courseId]);

  const deleteModule = useCallback(async (moduleId: string): Promise<boolean> => {
    setIsDirty(true);
    try {
      await apiClient.delete(`/courses/${courseId}/modules/${moduleId}`);
      setCourse((prev) => {
        if (!prev) return prev;
        return { ...prev, modules: prev.modules.filter((m) => m.id !== moduleId) };
      });
      setIsDirty(false);
      toast.success('Module deleted');
      return true;
    } catch (err: unknown) {
      setIsDirty(false);
      toast.error(extractErrorMessage(err, 'Failed to delete module'));
      return false;
    }
  }, [courseId]);

  const reorderModules = useCallback(async (orders: { id: string; orderIndex: number }[]): Promise<boolean> => {
    setIsDirty(true);
    // Optimistic update
    setCourse((prev) => {
      if (!prev) return prev;
      const orderMap = new Map(orders.map((o) => [o.id, o.orderIndex]));
      return {
        ...prev,
        modules: [...prev.modules]
          .map((m) => ({ ...m, orderIndex: orderMap.get(m.id) ?? m.orderIndex }))
          .sort((a, b) => a.orderIndex - b.orderIndex),
      };
    });
    try {
      await apiClient.patch(`/courses/${courseId}/modules/reorder`, { orders });
      setIsDirty(false);
      return true;
    } catch (err: unknown) {
      setIsDirty(false);
      toast.error(extractErrorMessage(err, 'Failed to reorder modules'));
      // Rollback by refetching.
      void fetchCourse();
      return false;
    }
  }, [courseId, fetchCourse]);

  // ─── Lessons ─────────────────────────────────────────────────────────

  const addLesson = useCallback(async (body: CreateLessonInput): Promise<CourseLesson | null> => {
    setIsDirty(true);
    try {
      const res = await apiClient.post(`/courses/${courseId}/lessons`, body);
      const created = unwrapResponse<CourseLesson>(res);
      setCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map((m) =>
            m.id === body.moduleId
              ? { ...m, lessons: [...m.lessons, created] }
              : m,
          ),
        };
      });
      setIsDirty(false);
      toast.success('Lesson added');
      return created;
    } catch (err: unknown) {
      setIsDirty(false);
      toast.error(extractErrorMessage(err, 'Failed to add lesson'));
      return null;
    }
  }, [courseId]);

  const updateLesson = useCallback(async (lessonId: string, data: UpdateLessonInput): Promise<boolean> => {
    setIsDirty(true);
    try {
      const res = await apiClient.put(`/courses/${courseId}/lessons/${lessonId}`, data);
      const updated = unwrapResponse<CourseLesson>(res);
      setCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...updated } : l)),
          })),
        };
      });
      setIsDirty(false);
      return true;
    } catch (err: unknown) {
      setIsDirty(false);
      toast.error(extractErrorMessage(err, 'Failed to update lesson'));
      return false;
    }
  }, [courseId]);

  const deleteLesson = useCallback(async (lessonId: string): Promise<boolean> => {
    setIsDirty(true);
    try {
      await apiClient.delete(`/courses/${courseId}/lessons/${lessonId}`);
      setCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map((m) => ({
            ...m,
            lessons: m.lessons.filter((l) => l.id !== lessonId),
          })),
        };
      });
      setIsDirty(false);
      toast.success('Lesson deleted');
      return true;
    } catch (err: unknown) {
      setIsDirty(false);
      toast.error(extractErrorMessage(err, 'Failed to delete lesson'));
      return false;
    }
  }, [courseId]);

  const reorderLessons = useCallback(async (orders: { id: string; moduleId: string; orderIndex: number }[]): Promise<boolean> => {
    setIsDirty(true);
    // Optimistic update: rebuild the tree from the orders[] array.
    setCourse((prev) => {
      if (!prev) return prev;
      const orderMap = new Map(orders.map((o) => [o.id, { moduleId: o.moduleId, orderIndex: o.orderIndex }]));
      // Collect all lessons, reassign moduleId + orderIndex from the map where present.
      const allLessons = prev.modules.flatMap((m) => m.lessons).map((l) => {
        const update = orderMap.get(l.id);
        return update ? { ...l, moduleId: update.moduleId, orderIndex: update.orderIndex } : l;
      });
      // Redistribute per module.
      return {
        ...prev,
        modules: prev.modules.map((m) => ({
          ...m,
          lessons: allLessons
            .filter((l) => l.moduleId === m.id)
            .sort((a, b) => a.orderIndex - b.orderIndex),
        })),
      };
    });
    try {
      await apiClient.patch(`/courses/${courseId}/lessons/reorder`, { orders });
      setIsDirty(false);
      return true;
    } catch (err: unknown) {
      setIsDirty(false);
      toast.error(extractErrorMessage(err, 'Failed to reorder lessons'));
      // Rollback by refetching.
      void fetchCourse();
      return false;
    }
  }, [courseId, fetchCourse]);

  // ─── Review workflow ────────────────────────────────────────────────

  const submitForReview = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiClient.post(`/courses/${courseId}/submit-for-review`);
      const updated = unwrapResponse<Course>(res);
      setCourse((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success('Course submitted for review');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to submit course for review'));
      return false;
    }
  }, [courseId]);

  return {
    course,
    loading,
    isDirty,
    updateCourse,
    addModule,
    updateModule,
    deleteModule,
    reorderModules,
    addLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    submitForReview,
    refresh: fetchCourse,
  };
}
