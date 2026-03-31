import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useCurrentParent } from './useCurrentParent';
import type { Attendance } from '@/types';

export interface ChildAttendance {
  childId: string;
  firstName: string;
  lastName: string;
  records: Attendance[];
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

interface ParentAttendanceResult {
  childAttendance: ChildAttendance[];
  loading: boolean;
}

export function useParentAttendance(): ParentAttendanceResult {
  const { children, loading: parentLoading } = useCurrentParent();
  const [childAttendance, setChildAttendance] = useState<ChildAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parentLoading) return;
    if (children.length === 0) { setLoading(false); return; }

    async function fetchData() {
      try {
        const results: ChildAttendance[] = [];
        for (const child of children) {
          let records: Attendance[] = [];
          try {
            const res = await apiClient.get(`/attendance/student/${child.id}`);
            records = unwrapList<Attendance>(res);
          } catch { /* no records */ }

          const total = records.length;
          const present = records.filter((r) => r.status === 'present').length;
          const absent = records.filter((r) => r.status === 'absent').length;
          const late = records.filter((r) => r.status === 'late').length;
          const excused = records.filter((r) => r.status === 'excused').length;
          const rate = total > 0 ? Math.round((present / total) * 100) : 0;

          const userId = child.userId as { firstName?: string; lastName?: string } | string | undefined;
          const populatedUser = typeof userId === 'object' && userId !== null ? userId : undefined;

          results.push({
            childId: child.id,
            firstName: child.user?.firstName ?? populatedUser?.firstName ?? child.firstName ?? '',
            lastName: child.user?.lastName ?? populatedUser?.lastName ?? child.lastName ?? '',
            records, total, present, absent, late, excused, rate,
          });
        }
        setChildAttendance(results);
      } catch {
        console.error('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [parentLoading, children]);

  return { childAttendance, loading: loading || parentLoading };
}
