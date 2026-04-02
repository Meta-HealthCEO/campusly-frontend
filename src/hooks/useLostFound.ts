import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { FoundItem, LostReport } from '@/types';

/* ── Category mapping between frontend and backend ─────────── */
const FE_TO_BE_CATEGORY: Record<string, string> = {
  sports: 'sports_equipment',
  bags: 'bag',
};
const BE_TO_FE_CATEGORY: Record<string, string> = {
  sports_equipment: 'sports',
  bag: 'bags',
};

function mapCategoryToBackend(cat: string): string {
  return FE_TO_BE_CATEGORY[cat] ?? cat;
}
function mapCategoryToFrontend(cat: string): string {
  return BE_TO_FE_CATEGORY[cat] ?? cat;
}

/* ── Status mapping between backend and frontend ───────────── */
function mapFoundStatus(status: string): FoundItem['status'] {
  if (status === 'found') return 'unclaimed';
  if (status === 'returned') return 'claimed'; // returned items show as claimed
  return status as FoundItem['status'];
}

function mapLostStatus(status: string): LostReport['status'] {
  if (status === 'found') return 'open';
  if (status === 'returned') return 'resolved';
  if (status === 'archived') return 'closed';
  return status as LostReport['status'];
}

/* ── Stats type ────────────────────────────────────────────── */
export interface LostFoundStats {
  totalFound: number;
  totalClaimed: number;
  totalUnclaimed: number;
  totalReturned: number;
  avgDaysToClaim: number;
}

/* ── Raw API item shape ────────────────────────────────────── */
interface RawItem {
  _id?: string;
  id?: string;
  type?: string;
  status?: string;
  itemName?: string;
  description?: string;
  category?: string;
  locationFound?: string;
  locationLost?: string;
  dateFound?: string;
  dateLost?: string;
  photos?: string[];
  reportedBy?: { firstName?: string; lastName?: string } | string;
  claimedBy?: { firstName?: string; lastName?: string } | string;
  studentId?: { firstName?: string; lastName?: string } | string;
  matchedItemId?: string;
  claimedDate?: string;
  createdAt?: string;
}

function formatReporter(rb: RawItem['reportedBy']): string {
  if (!rb) return 'Unknown';
  if (typeof rb === 'string') return rb;
  return [rb.firstName, rb.lastName].filter(Boolean).join(' ') || 'Unknown';
}

function rawToFoundItem(raw: RawItem): FoundItem {
  return {
    id: raw._id ?? raw.id ?? '',
    name: raw.itemName ?? '',
    description: raw.description ?? '',
    category: mapCategoryToFrontend(raw.category ?? 'other') as FoundItem['category'],
    location: raw.locationFound ?? '',
    photoUrl: raw.photos?.[0],
    dateFound: raw.dateFound ?? raw.createdAt ?? '',
    status: mapFoundStatus(raw.status ?? 'found'),
    reportedBy: formatReporter(raw.reportedBy),
    claimedBy: typeof raw.claimedBy === 'object' && raw.claimedBy
      ? [raw.claimedBy.firstName, raw.claimedBy.lastName].filter(Boolean).join(' ')
      : undefined,
    claimedDate: raw.claimedDate,
    matchedReportId: raw.matchedItemId,
  };
}

function rawToLostReport(raw: RawItem): LostReport {
  const student = typeof raw.studentId === 'object' && raw.studentId
    ? raw.studentId : undefined;
  return {
    id: raw._id ?? raw.id ?? '',
    studentId: typeof raw.studentId === 'string' ? raw.studentId : (raw._id ?? ''),
    studentName: student ? [student.firstName, student.lastName].filter(Boolean).join(' ') : '',
    parentId: typeof raw.reportedBy === 'string' ? raw.reportedBy : '',
    parentName: formatReporter(raw.reportedBy),
    itemName: raw.itemName ?? '',
    description: raw.description ?? '',
    category: mapCategoryToFrontend(raw.category ?? 'other') as LostReport['category'],
    locationLost: raw.locationLost ?? '',
    dateLost: raw.dateLost ?? raw.createdAt ?? '',
    status: mapLostStatus(raw.status ?? 'found'),
    matchedItemId: raw.matchedItemId,
    createdAt: raw.createdAt ?? '',
  };
}

/* ── Suggestion type from the API ──────────────────────────── */
export interface MatchSuggestion {
  id: string;
  itemName: string;
  category: string;
  type: string;
  status: string;
  locationFound?: string;
  dateFound?: string;
  reportedBy: string;
}

/* ── Main hook ─────────────────────────────────────────────── */
export function useLostFound() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [lostReports, setLostReports] = useState<LostReport[]>([]);
  const [stats, setStats] = useState<LostFoundStats | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Fetch all items ──────────────────────────────────────── */
  const fetchItems = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get('/lost-found', { params: { schoolId } });
      const raw = unwrapResponse(res);
      const items: RawItem[] = Array.isArray(raw) ? raw : (raw.items ?? []);

      const found: FoundItem[] = [];
      const lost: LostReport[] = [];
      items.forEach((item) => {
        if (item.type === 'lost') {
          lost.push(rawToLostReport(item));
        } else {
          found.push(rawToFoundItem(item));
        }
      });
      setFoundItems(found);
      setLostReports(lost);
    } catch {
      console.error('Failed to load lost & found items');
    }
  }, [schoolId]);

  /* ── Fetch stats ──────────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get('/lost-found/stats', { params: { schoolId } });
      const raw = unwrapResponse(res);
      setStats({
        totalFound: raw.totalFound ?? 0,
        totalClaimed: raw.totalClaimed ?? 0,
        totalUnclaimed: raw.totalUnclaimed ?? 0,
        totalReturned: raw.totalReturned ?? 0,
        avgDaysToClaim: raw.avgDaysToClaim ?? 0,
      });
    } catch {
      console.error('Failed to load stats');
    }
  }, [schoolId]);

  /* ── Initial load ─────────────────────────────────────────── */
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchItems(), fetchStats()]);
      setLoading(false);
    }
    init();
  }, [fetchItems, fetchStats]);

  /* ── Report a found item ──────────────────────────────────── */
  const reportFoundItem = async (data: {
    name: string;
    description: string;
    category: string;
    location: string;
    dateFound: string;
    photoUrl?: string;
  }) => {
    await apiClient.post('/lost-found', {
      schoolId,
      type: 'found',
      itemName: data.name,
      description: data.description,
      category: mapCategoryToBackend(data.category),
      locationFound: data.location,
      dateFound: data.dateFound,
      photos: data.photoUrl ? [data.photoUrl] : [],
    });
    toast.success('Found item logged successfully!');
    await Promise.all([fetchItems(), fetchStats()]);
  };

  /* ── Claim an item ────────────────────────────────────────── */
  const claimItem = async (itemId: string, studentId?: string) => {
    await apiClient.post(`/lost-found/${itemId}/claim`, studentId ? { studentId } : {});
    toast.success('Item claimed successfully!');
    await Promise.all([fetchItems(), fetchStats()]);
  };

  /* ── Verify and return ────────────────────────────────────── */
  const verifyItem = async (itemId: string) => {
    await apiClient.post(`/lost-found/${itemId}/verify`);
    toast.success('Item verified and marked as returned.');
    await Promise.all([fetchItems(), fetchStats()]);
  };

  /* ── Match lost to found ──────────────────────────────────── */
  const matchItems = async (lostId: string, foundId: string) => {
    await apiClient.post(`/lost-found/${lostId}/match/${foundId}`);
    toast.success('Items matched successfully!');
    await Promise.all([fetchItems(), fetchStats()]);
  };

  /* ── Fetch suggestions ────────────────────────────────────── */
  const fetchSuggestions = async (itemId: string): Promise<MatchSuggestion[]> => {
    try {
      const res = await apiClient.get(`/lost-found/${itemId}/suggestions`);
      const raw = unwrapResponse(res);
      const arr: RawItem[] = Array.isArray(raw) ? raw : [];
      return arr.map((s) => ({
        id: s._id ?? s.id ?? '',
        itemName: s.itemName ?? '',
        category: mapCategoryToFrontend(s.category ?? 'other'),
        type: s.type ?? 'found',
        status: s.status ?? 'found',
        locationFound: s.locationFound,
        dateFound: s.dateFound,
        reportedBy: formatReporter(s.reportedBy),
      }));
    } catch {
      console.error('Failed to load suggestions');
      return [];
    }
  };

  /* ── Archive old items ────────────────────────────────────── */
  const archiveOldItems = async () => {
    const res = await apiClient.post('/lost-found/archive', { schoolId });
    const raw = unwrapResponse(res);
    const count = raw.archivedCount ?? 0;
    toast.success(`${count} item${count !== 1 ? 's' : ''} archived.`);
    await Promise.all([fetchItems(), fetchStats()]);
  };

  /* ── Soft delete ──────────────────────────────────────────── */
  const softDelete = async (itemId: string) => {
    await apiClient.delete(`/lost-found/${itemId}`);
    toast.success('Item deleted.');
    await Promise.all([fetchItems(), fetchStats()]);
  };

  return {
    foundItems,
    lostReports,
    stats,
    loading,
    reportFoundItem,
    claimItem,
    verifyItem,
    matchItems,
    fetchSuggestions,
    archiveOldItems,
    softDelete,
    refresh: () => Promise.all([fetchItems(), fetchStats()]),
  };
}
