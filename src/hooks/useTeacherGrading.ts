import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

interface Assignment {
  id: string;
  title: string;
}

export function useTeacherGradingAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    async function loadAssignments() {
      try {
        const response = await apiClient.get('/homework');
        const list = unwrapList<Record<string, unknown>>(response);
        setAssignments(
          list.map((raw) => ({
            id: (raw.id as string) ?? '',
            title:
              (raw.title as string) ??
              (raw.name as string) ??
              'Untitled',
          })),
        );
      } catch {
        setAssignments([]);
      } finally {
        setLoadingAssignments(false);
      }
    }
    loadAssignments();
  }, []);

  return { assignments, loadingAssignments };
}

export type { Assignment };
