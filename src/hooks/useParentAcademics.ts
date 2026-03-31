import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useCurrentParent } from './useCurrentParent';
import type { StudentGrade, Homework } from '@/types';

export interface ChildAcademicData {
  childId: string;
  firstName: string;
  lastName: string;
  gradeName: string;
  className: string;
  marks: StudentGrade[];
  homework: Homework[];
}

interface ParentAcademicsResult {
  childData: ChildAcademicData[];
  loading: boolean;
}

export function useParentAcademics(): ParentAcademicsResult {
  const { children, loading: parentLoading } = useCurrentParent();
  const [childData, setChildData] = useState<ChildAcademicData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parentLoading) return;
    if (children.length === 0) { setLoading(false); return; }

    async function fetchData() {
      try {
        // Fetch homework (shared across children)
        let allHomework: Homework[] = [];
        try {
          const hwRes = await apiClient.get('/homework');
          allHomework = unwrapList<Homework>(hwRes);
        } catch { /* no homework */ }

        // Fetch marks per child
        const results: ChildAcademicData[] = [];
        for (const child of children) {
          let marks: StudentGrade[] = [];
          try {
            const mRes = await apiClient.get(`/academic/marks/student/${child.id}`);
            marks = unwrapList<StudentGrade>(mRes);
          } catch { /* no marks */ }

          const childHomework = child.classId
            ? allHomework.filter((hw) => hw.classId === child.classId)
            : allHomework;

          const userId = child.userId as { firstName?: string; lastName?: string } | string | undefined;
          const populatedUser = typeof userId === 'object' && userId !== null ? userId : undefined;

          results.push({
            childId: child.id,
            firstName: child.user?.firstName ?? populatedUser?.firstName ?? child.firstName ?? '',
            lastName: child.user?.lastName ?? populatedUser?.lastName ?? child.lastName ?? '',
            gradeName: child.grade?.name ?? '',
            className: child.class?.name ?? '',
            marks,
            homework: childHomework,
          });
        }
        setChildData(results);
      } catch {
        console.error('Failed to load academic data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [parentLoading, children]);

  return { childData, loading: loading || parentLoading };
}
