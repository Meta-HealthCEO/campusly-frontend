import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { normalizeHomework } from '@/lib/homework-helpers';
import type { Homework, Subject, SchoolClass } from '@/types';
import type { HomeworkFormValues } from '@/components/homework/HomeworkForm';

interface SubmissionCounts {
  total: number;
  graded: number;
}

export function useTeacherHomework() {
  const { user } = useAuthStore();
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classOptions, setClassOptions] = useState<SchoolClass[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<
    Record<string, SubmissionCounts>
  >({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubmissionCounts = useCallback(
    async (hwList: Homework[]) => {
      const counts: Record<string, SubmissionCounts> = {};
      const requests = hwList.map(async (hw) => {
        try {
          const res = await apiClient.get(`/homework/${hw._id}/submissions`);
          const subs = unwrapList<{ mark?: number | null }>(res);
          const graded = subs.filter(
            (s) => s.mark !== null && s.mark !== undefined,
          ).length;
          counts[hw._id] = { total: subs.length, graded };
        } catch {
          counts[hw._id] = { total: 0, graded: 0 };
        }
      });
      await Promise.allSettled(requests);
      setSubmissionCounts(counts);
    },
    [],
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const [hwRes, subjectsRes, classesRes] = await Promise.allSettled([
          apiClient.get('/homework'),
          apiClient.get('/academic/subjects'),
          apiClient.get('/academic/classes'),
        ]);

        let hwItems: Homework[] = [];
        if (hwRes.status === 'fulfilled') {
          const raw = unwrapList<Record<string, unknown>>(hwRes.value);
          hwItems = raw.map(
            (r) => normalizeHomework(r as Parameters<typeof normalizeHomework>[0]),
          );
          setHomeworkList(hwItems);
        }

        if (subjectsRes.status === 'fulfilled') {
          setSubjects(unwrapList<Subject>(subjectsRes.value));
        }

        if (classesRes.status === 'fulfilled') {
          setClassOptions(unwrapList<SchoolClass>(classesRes.value));
        }

        // Fetch submission counts for teacher's homework
        const teacherHw = hwItems.filter((hw) => hw.teacherId === user?.id);
        if (teacherHw.length > 0) {
          await fetchSubmissionCounts(teacherHw);
        }
      } catch (err: unknown) {
        console.error('Failed to load homework data', err);
        toast.error('Could not load homework data. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id, fetchSubmissionCounts]);

  const createHomework = useCallback(
    async (data: HomeworkFormValues) => {
      try {
        const payload = {
          ...data,
          totalMarks: Number(data.totalMarks),
          schoolId: user?.schoolId,
          dueDate: new Date(data.dueDate).toISOString(),
        };
        const response = await apiClient.post('/homework', payload);
        const raw = unwrapResponse(response);
        const newHw = normalizeHomework(
          raw as Parameters<typeof normalizeHomework>[0],
        );
        setHomeworkList((prev) => [newHw, ...prev]);
        setSubmissionCounts((prev) => ({
          ...prev,
          [newHw._id]: { total: 0, graded: 0 },
        }));
        toast.success('Homework created successfully');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to create homework'));
        return false;
      }
    },
    [user?.schoolId],
  );

  const deleteHomework = useCallback(
    async (hwId: string) => {
      setDeleting(hwId);
      try {
        await apiClient.delete(`/homework/${hwId}`);
        setHomeworkList((prev) => prev.filter((hw) => hw._id !== hwId));
        toast.success('Homework deleted');
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to delete homework'));
        throw err;
      } finally {
        setDeleting(null);
      }
    },
    [],
  );

  const teacherHomework = homeworkList.filter(
    (hw) => hw.teacherId === user?.id,
  );

  return {
    homeworkList,
    teacherHomework,
    subjects,
    classOptions,
    submissionCounts,
    deleting,
    loading,
    createHomework,
    deleteHomework,
  };
}

export type { SubmissionCounts };
