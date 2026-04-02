import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { useCurrentStudent } from './useCurrentStudent';
import { normalizeHomework, normalizeSubmission } from '@/lib/homework-helpers';
import type { Homework, HomeworkSubmission } from '@/types';

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
            normalized.filter(
              (hw) =>
                hw.status === 'published' || hw.status === ('assigned' as Homework['status'])
            )
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
  submission: HomeworkSubmission | null;
  loading: boolean;
  submitHomework: (content: string) => Promise<void>;
}

export function useStudentHomeworkDetail(homeworkId: string): StudentHomeworkDetailResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [submission, setSubmission] = useState<HomeworkSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentLoading) return;

    async function fetchData() {
      try {
        const hwRes = await apiClient.get(`/homework/${homeworkId}`);
        const hwRaw = unwrapResponse(hwRes);
        setHomework({ ...(hwRaw as Record<string, unknown>), id: (hwRaw._id as string) ?? (hwRaw.id as string) } as unknown as Homework);

        if (student) {
          const sid = student._id ?? student.id;
          const subRes = await apiClient.get(`/homework/student/${sid}/submissions`);
          const subs = unwrapList<HomeworkSubmission>(subRes, 'submissions');
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

  const submitHomework = async (content: string) => {
    if (!content.trim() || !student) return;
    try {
      await apiClient.post(`/homework/${homeworkId}/submit`, {
        files: [content.trim()],
      });
      setSubmission({
        id: 'new',
        homeworkId,
        studentId: student.id,
        content,
        submittedAt: new Date().toISOString(),
        attachments: [],
        status: 'submitted',
      } as unknown as HomeworkSubmission);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Failed to submit homework'));
    }
  };

  return { homework, submission, loading: studentLoading || loading, submitHomework };
}
