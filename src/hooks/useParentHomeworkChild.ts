'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type { Homework, StructuredHomeworkSubmission } from '@/types/homework';

export function useParentHomeworkChild(
  homeworkId: string,
  studentId: string | null,
): {
  homework: Homework | null;
  submission: StructuredHomeworkSubmission | null;
  loading: boolean;
} {
  const [homework, setHomework] = useState<Homework | null>(null);
  const [submission, setSubmission] = useState<StructuredHomeworkSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const hasTarget = !!homeworkId && !!studentId;

  useEffect(() => {
    if (!hasTarget) return;
    const controller = new AbortController();
    Promise.all([
      apiClient.get(`/homework/${homeworkId}`, {
        params: { studentId },
        signal: controller.signal,
      }),
      apiClient.get(`/homework/student/${studentId}/submissions`, { signal: controller.signal }),
    ])
      .then(([hwRes, subRes]) => {
        setHomework(unwrapResponse<Homework>(hwRes));
        const subs = unwrapList<StructuredHomeworkSubmission>(subRes);
        const match = subs.find((s) => s.homeworkId === homeworkId) ?? null;
        setSubmission(match);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load parent homework view', err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [hasTarget, homeworkId, studentId]);

  return {
    homework: hasTarget ? homework : null,
    submission: hasTarget ? submission : null,
    loading: hasTarget ? loading : false,
  };
}
