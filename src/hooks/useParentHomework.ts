import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

export interface ParentHomeworkItem {
  id: string;
  _id?: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  status: 'assigned' | 'closed';
  subjectId?: { name?: string; code?: string };
  classId?: { name?: string };
  teacherId?: { firstName?: string; lastName?: string };
  submission?: {
    submittedAt?: string;
    mark?: number;
    feedback?: string;
    isLate?: boolean;
    gradedAt?: string;
  };
}

export type HomeworkDisplayStatus = 'pending' | 'submitted' | 'graded' | 'overdue';

export function getHomeworkDisplayStatus(hw: ParentHomeworkItem): HomeworkDisplayStatus {
  if (hw.submission?.gradedAt) return 'graded';
  if (hw.submission?.submittedAt) return 'submitted';
  if (new Date(hw.dueDate) < new Date() && hw.status !== 'closed') return 'overdue';
  return 'pending';
}

interface UseParentHomeworkResult {
  homework: ParentHomeworkItem[];
  loading: boolean;
  loadHomework: (studentId: string) => Promise<void>;
}

export function useParentHomework(): UseParentHomeworkResult {
  const [homework, setHomework] = useState<ParentHomeworkItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHomework = useCallback(async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/homework/parent/${studentId}`);
      const raw = unwrapResponse(res);
      const items = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).data ?? [];
      setHomework(items as ParentHomeworkItem[]);
    } catch (err: unknown) {
      console.error('Failed to load parent homework:', err);
      setHomework([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { homework, loading, loadHomework };
}
