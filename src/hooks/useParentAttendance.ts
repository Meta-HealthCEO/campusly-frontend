import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useCurrentParent } from './useCurrentParent';
import { toISODate } from '@/lib/utils';
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
  /** The month currently being viewed (year + month) */
  selectedMonth: Date;
  setSelectedMonth: (month: Date) => void;
}

export function useParentAttendance(): ParentAttendanceResult {
  const { children, loading: parentLoading } = useCurrentParent();
  const [childAttendance, setChildAttendance] = useState<ChildAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());

  useEffect(() => {
    if (parentLoading) return;
    if (children.length === 0) { setLoading(false); return; }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const startDate = toISODate(new Date(year, month, 1));
        const endDate = toISODate(new Date(year, month + 1, 0));

        const results: ChildAttendance[] = [];
        for (const child of children) {
          let records: Attendance[] = [];
          try {
            const res = await apiClient.get(`/attendance/student/${child.id}`, {
              params: { startDate, endDate },
            });
            records = unwrapList<Attendance>(res);
          } catch { /* no records */ }

          const total = records.length;
          const present = records.filter((r: Attendance) => r.status === 'present').length;
          const absent = records.filter((r: Attendance) => r.status === 'absent').length;
          const late = records.filter((r: Attendance) => r.status === 'late').length;
          const excused = records.filter((r: Attendance) => r.status === 'excused').length;
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
        if (!cancelled) setChildAttendance(results);
      } catch {
        console.error('Failed to load attendance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();

    return () => { cancelled = true; };
  }, [parentLoading, children, selectedMonth]);

  return { childAttendance, loading: loading || parentLoading, selectedMonth, setSelectedMonth };
}
