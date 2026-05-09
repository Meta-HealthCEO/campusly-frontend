import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { useCurrentStudent } from './useCurrentStudent';
import { normalizeHomework, normalizeSubmission } from '@/lib/homework-helpers';
import { toast } from 'sonner';
import type { Homework, HomeworkSubmission } from '@/types';
import type { StructuredHomeworkSubmission, SubmitHomeworkPayload } from '@/types/homework';

type RawHomeworkInput = Parameters<typeof normalizeHomework>[0];

interface StudentHomeworkListResult {
  homeworkList: Homework[];
  submissions: HomeworkSubmission[];
  loading: boolean;
}

export function useStudentHomeworkList(): StudentHomeworkListResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) {
      if (!studentLoading) setLoading(false);
      return;
    }

    const currentStudent = student;
    async function fetchData() {
      try {
        const sid = currentStudent._id ?? currentStudent.id;
        const [hwRes, subRes] = await Promise.allSettled([
          apiClient.get('/homework'),
          apiClient.get(`/homework/student/${sid}/submissions`),
        ]);

        if (hwRes.status === 'fulfilled' && hwRes.value.data) {
          const arr = unwrapList<Record<string, unknown>>(hwRes.value);
          const normalized = (arr as unknown[]).map((raw) => normalizeHomework(raw as Parameters<typeof normalizeHomework>[0]));
          setHomeworkList(
            normalized.filter((hw) => hw.status === 'assigned')
          );
        }

        if (subRes.status === 'fulfilled' && subRes.value.data) {
          const arr = unwrapList<Record<string, unknown>>(subRes.value);
          setSubmissions((arr as unknown[]).map((raw) => normalizeSubmission(raw as Parameters<typeof normalizeSubmission>[0])));
        }
      } catch {
        console.error('Failed to load homework');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [student, studentLoading]);

  return { homeworkList, submissions, loading: studentLoading || loading };
}

interface StudentHomeworkDetailResult {
  homework: Homework | null;
  submission: StructuredHomeworkSubmission | null;
  loading: boolean;
  submitHomework: (payload: SubmitHomeworkPayload) => Promise<StructuredHomeworkSubmission | null>;
}

export function useStudentHomeworkDetail(homeworkId: string): StudentHomeworkDetailResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [submission, setSubmission] = useState<StructuredHomeworkSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentLoading) return;

    async function fetchData() {
      try {
        const hwRes = await apiClient.get(`/homework/${homeworkId}`);
        const hwRaw = unwrapResponse(hwRes);
        setHomework(normalizeHomework(hwRaw as RawHomeworkInput));

        if (student) {
          const sid = student._id ?? student.id;
          const subRes = await apiClient.get(`/homework/student/${sid}/submissions`);
          const subs = unwrapList<StructuredHomeworkSubmission>(subRes, 'submissions');
          const match = subs.find((s) => s.homeworkId === homeworkId);
          if (match) setSubmission(match);
        }
      } catch {
        console.error('Failed to load homework');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [homeworkId, student, studentLoading]);

  const submitHomework = useCallback(async (payload: SubmitHomeworkPayload): Promise<StructuredHomeworkSubmission | null> => {
    try {
      const res = await apiClient.post(`/homework/${homeworkId}/submit`, payload);
      const data = unwrapResponse<StructuredHomeworkSubmission>(res);
      setSubmission(data);
      return data;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : extractErrorMessage(err, 'Submit failed'));
      return null;
    }
  }, [homeworkId]);

  return { homework, submission, loading: studentLoading || loading, submitHomework };
}
