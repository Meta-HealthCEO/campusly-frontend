import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, mapId } from '@/lib/api-helpers';
import type { FoundItem, LostReport } from '@/types';

interface ParentLostFoundResult {
  foundItems: FoundItem[];
  lostReports: LostReport[];
  loading: boolean;
  submitLostReport: (data: Record<string, unknown>) => Promise<void>;
  refetchLostReports: () => Promise<void>;
}

function separateItems(
  raw: Record<string, unknown>[],
  childIdSet: Set<string>,
): { found: FoundItem[]; lost: LostReport[] } {
  const found: FoundItem[] = [];
  const lost: LostReport[] = [];
  raw.forEach((item) => {
    const mapped = mapId(item);
    if (
      item.dateFound ||
      item.status === 'unclaimed' ||
      item.status === 'claimed' ||
      item.status === 'archived'
    ) {
      found.push(mapped as unknown as FoundItem);
    } else {
      const report = mapped as unknown as LostReport;
      if (!report.studentId || childIdSet.has(report.studentId)) {
        lost.push(report);
      }
    }
  });
  return { found, lost };
}

export function useParentLostFound(childIdSet: Set<string>): ParentLostFoundResult {
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [lostReports, setLostReports] = useState<LostReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get('/lost-found');
      const raw = res.data.data ?? res.data;
      if (Array.isArray(raw)) {
        const { found, lost } = separateItems(raw as Record<string, unknown>[], childIdSet);
        setFoundItems(found);
        setLostReports(lost);
      } else {
        const obj = raw as Record<string, unknown>;
        const fi = (obj.foundItems ?? obj.found ?? []) as Record<string, unknown>[];
        const lr = (obj.lostReports ?? obj.reports ?? []) as Record<string, unknown>[];
        setFoundItems(fi.map(mapId) as unknown as FoundItem[]);
        const allReports = lr.map(mapId) as unknown as LostReport[];
        setLostReports(allReports.filter((r) => !r.studentId || childIdSet.has(r.studentId)));
      }
    } catch {
      console.error('Failed to load lost & found data');
    } finally {
      setLoading(false);
    }
  }, [childIdSet]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submitLostReport = useCallback(async (data: Record<string, unknown>) => {
    await apiClient.post('/lost-found', { ...data, type: 'lost' });
    // Refresh lost reports
    const res = await apiClient.get('/lost-found');
    const rawResp = res.data.data ?? res.data;
    if (Array.isArray(rawResp)) {
      const lost = (rawResp as Record<string, unknown>[]).filter(
        (item) =>
          !item.dateFound &&
          item.status !== 'unclaimed' &&
          item.status !== 'claimed' &&
          item.status !== 'archived'
      );
      setLostReports(
        lost.map(mapId) as unknown as LostReport[]
      );
    }
  }, []);

  const refetchLostReports = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { foundItems, lostReports, loading, submitLostReport, refetchLostReports };
}
