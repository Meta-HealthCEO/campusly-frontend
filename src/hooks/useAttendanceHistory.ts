import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, resolveId } from '@/lib/api-helpers';

export type HistoryStatus = 'present' | 'absent' | 'late' | 'excused';

export interface HistoryRecord {
  studentId: string;
  date: string;       // YYYY-MM-DD
  status: HistoryStatus;
  notes?: string;
  period: number;
}

interface RawRecord {
  studentId: string | { id?: string; _id?: string };
  date: string | Date;
  status: HistoryStatus;
  notes?: string;
  period?: number;
}

function normalizeDate(d: string | Date): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

interface UseAttendanceHistoryOptions {
  classId: string | null;
  period: number;
  dateFrom: string;   // YYYY-MM-DD
  dateTo: string;     // YYYY-MM-DD
}

export function useAttendanceHistory({ classId, period, dateFrom, dateTo }: UseAttendanceHistoryOptions) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!classId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/attendance/class/${classId}`, {
        params: { dateFrom, dateTo, period },
      });
      const raw = unwrapList<RawRecord>(res);
      const mapped: HistoryRecord[] = raw
        .filter((r) => (r.period ?? 1) === period)
        .map((r) => ({
          studentId: resolveId(r.studentId),
          date: normalizeDate(r.date),
          status: r.status,
          notes: r.notes,
          period: r.period ?? 1,
        }))
        .filter((r) => r.studentId);
      setRecords(mapped);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load attendance history', err);
      setError('Could not load attendance history');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [classId, period, dateFrom, dateTo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { records, loading, error, refresh };
}
