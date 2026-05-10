import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { QuestionItem } from '@/types/question-bank';

/** Quiz summary populated on Homework.quizId. */
export interface PopulatedQuizSummary {
  id: string;
  title: string;
  totalPoints: number;
  questionCount: number;
}

/** Reading resource summary populated on Homework.contentResourceId. */
export interface PopulatedReadingSummary {
  id: string;
  title: string;
  type?: string;
}

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
  resourceId?: string;
  resourceType?: string;
  resourceTitle?: string;
  version: number;
  type: 'quiz' | 'reading' | 'exercise';
  /** Populated from backend for type === 'exercise'. */
  exerciseQuestions: QuestionItem[];
  /** Populated from backend for type === 'quiz'. */
  quiz: PopulatedQuizSummary | null;
  /** Populated from backend for type === 'reading'. */
  reading: PopulatedReadingSummary | null;
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
          const raw = unwrapResponse(hwRes.value);
          const subjectObj =
            typeof raw.subjectId === 'object' ? raw.subjectId as Record<string, unknown> : null;
          const classObj =
            typeof raw.classId === 'object' ? raw.classId as Record<string, unknown> : null;
          const backendStatus =
            raw.status === 'assigned' ? 'assigned' : raw.status;

          // Resolve resource if populated
          const resourceObj =
            typeof raw.resourceId === 'object' && raw.resourceId !== null
              ? (raw.resourceId as Record<string, unknown>)
              : null;

          // Populated arrays / refs from backend service.getById
          const exerciseQs = Array.isArray(raw.exerciseQuestionIds)
            ? (raw.exerciseQuestionIds as unknown[]).filter(
                (q): q is Record<string, unknown> =>
                  typeof q === 'object' && q !== null,
              )
            : [];

          const quizObj =
            typeof raw.quizId === 'object' && raw.quizId !== null
              ? (raw.quizId as Record<string, unknown>)
              : null;

          const contentObj =
            typeof raw.contentResourceId === 'object' && raw.contentResourceId !== null
              ? (raw.contentResourceId as Record<string, unknown>)
              : null;

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
            resourceId: resourceObj
              ? ((resourceObj._id as string) ?? (resourceObj.id as string))
              : (typeof raw.resourceId === 'string' ? raw.resourceId as string : undefined),
            resourceType: (resourceObj?.type as string) ?? undefined,
            resourceTitle: (resourceObj?.title as string) ?? undefined,
            version: (raw.version as number) ?? 1,
            type: (raw.type as 'quiz' | 'reading' | 'exercise') ?? 'quiz',
            exerciseQuestions: exerciseQs.map((q) => ({
              ...(q as unknown as QuestionItem),
              id: (q.id as string) ?? (q._id as string) ?? '',
            })),
            quiz: quizObj
              ? {
                  id: (quizObj.id as string) ?? (quizObj._id as string) ?? '',
                  title: (quizObj.title as string) ?? '',
                  totalPoints: (quizObj.totalPoints as number) ?? 0,
                  questionCount: Array.isArray(quizObj.questions)
                    ? (quizObj.questions as unknown[]).length
                    : 0,
                }
              : null,
            reading: contentObj
              ? {
                  id: (contentObj.id as string) ?? (contentObj._id as string) ?? '',
                  title: (contentObj.title as string) ?? '',
                  type: (contentObj.type as string) ?? undefined,
                }
              : null,
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

  const gradeSubmission = useCallback(
    async (submissionId: string, body: { mark: number; feedback?: string }): Promise<SubmissionItem> => {
      const res = await apiClient.patch(
        `/homework/submissions/${submissionId}/grade`,
        body,
      );
      const updated = unwrapResponse(res);
      return {
        ...updated,
        id: (updated._id as string) ?? (updated.id as string) ?? submissionId,
      } as unknown as SubmissionItem;
    },
    [],
  );

  const handleGraded = useCallback((updated: SubmissionItem) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
    );
  }, []);

  return { homework, submissions, loading, changeStatus, gradeSubmission, handleGraded };
}

export type { HomeworkDetail, SubmissionItem };
