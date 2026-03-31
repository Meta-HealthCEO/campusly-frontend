import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';

interface HomeworkDetail {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  className: string;
  dueDate: string;
  totalMarks: number;
  status: string;
  attachments: string[];
  createdAt: string;
}

interface SubmissionItem {
  id: string;
  homeworkId: string;
  studentId: {
    _id: string;
    userId: { firstName: string; lastName: string; email: string };
  };
  files: string[];
  submittedAt: string;
  isLate: boolean;
  mark: number | null;
  feedback: string | null;
  gradedAt: string | null;
  gradedBy:
    | { _id: string; firstName: string; lastName: string }
    | string
    | null;
}

export function useTeacherHomeworkDetail(homeworkId: string) {
  const [homework, setHomework] = useState<HomeworkDetail | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [hwRes, subRes] = await Promise.allSettled([
          apiClient.get(`/homework/${homeworkId}`),
          apiClient.get(`/homework/${homeworkId}/submissions`),
        ]);

        if (hwRes.status === 'fulfilled') {
          const raw = unwrapResponse<Record<string, unknown>>(hwRes.value);
          const subjectObj =
            typeof raw.subjectId === 'object' ? raw.subjectId as Record<string, unknown> : null;
          const classObj =
            typeof raw.classId === 'object' ? raw.classId as Record<string, unknown> : null;
          const backendStatus =
            raw.status === 'assigned' ? 'assigned' : raw.status;

          setHomework({
            id: (raw.id as string) ?? '',
            title: raw.title as string,
            description: raw.description as string,
            subjectName: (subjectObj?.name as string) ?? '',
            className: (classObj?.name as string) ?? '',
            dueDate: raw.dueDate as string,
            totalMarks: (raw.totalMarks as number) ?? 100,
            status: backendStatus as string,
            attachments: (raw.attachments as string[]) ?? [],
            createdAt: (raw.createdAt as string) ?? '',
          });
        }

        if (subRes.status === 'fulfilled') {
          const arr = unwrapList<SubmissionItem>(subRes.value);
          setSubmissions(arr);
        }
      } catch {
        console.error('Failed to load homework detail');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [homeworkId]);

  const changeStatus = useCallback(
    async (newStatus: string) => {
      try {
        await apiClient.put(`/homework/${homeworkId}`, {
          status: newStatus,
        });
        setHomework((prev) =>
          prev ? { ...prev, status: newStatus } : prev,
        );
        toast.success(
          `Homework ${newStatus === 'closed' ? 'closed' : 'reopened'}`,
        );
      } catch (err: unknown) {
        toast.error(
          extractErrorMessage(err, 'Failed to update homework status'),
        );
      }
    },
    [homeworkId],
  );

  const handleGraded = useCallback((updated: SubmissionItem) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
    );
  }, []);

  return { homework, submissions, loading, changeStatus, handleGraded };
}

export type { HomeworkDetail, SubmissionItem };
