import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { DebtorEntry } from '@/types';

interface RawDebtor {
  _id: string;
  totalOwed: number;
  totalPaid: number;
  totalLateFees: number;
  invoiceCount: number;
  oldestDueDate: string;
  outstanding: number;
  ageDays: number;
  student?: {
    _id?: string;
    user?: { firstName?: string; lastName?: string };
    grade?: { name?: string };
    parents?: Array<{
      user?: { firstName?: string; lastName?: string };
    }>;
  };
}

export interface CollectionAction {
  _id: string;
  stage: string;
  notes?: string;
  sentVia?: string;
  createdAt: string;
  invoiceId?: { _id: string; invoiceNumber?: string };
  studentId?: {
    _id: string;
    user?: { firstName?: string; lastName?: string };
  };
}

function mapDebtorEntry(
  raw: RawDebtor,
): DebtorEntry & { studentId: string } {
  const studentUser = raw.student?.user;
  const studentName = studentUser
    ? `${studentUser.firstName ?? ''} ${studentUser.lastName ?? ''}`.trim()
    : 'Unknown Student';
  const parentUser = raw.student?.parents?.[0]?.user;
  const parentName = parentUser
    ? `${parentUser.firstName ?? ''} ${parentUser.lastName ?? ''}`.trim()
    : '\u2014';
  const grade = raw.student?.grade?.name ?? '\u2014';

  const age = raw.ageDays ?? 0;
  const amt = raw.outstanding ?? 0;
  let current = 0,
    days30 = 0,
    days60 = 0,
    days90 = 0,
    days120Plus = 0;

  if (age >= 120) days120Plus = amt;
  else if (age >= 90) days90 = amt;
  else if (age >= 60) days60 = amt;
  else if (age >= 30) days30 = amt;
  else current = amt;

  return {
    parentId:
      raw.student?.parents?.[0]?.user ? (raw._id ?? '') : '',
    parentName,
    studentName,
    grade,
    totalOwed: raw.totalOwed ?? 0,
    current,
    days30,
    days60,
    days90,
    days120Plus,
    lastPaymentDate: undefined,
    studentId: raw.student?._id ?? raw._id ?? '',
  };
}

export function useDebtors() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [data, setData] = useState<
    (DebtorEntry & { studentId: string })[]
  >([]);
  const [actions, setActions] = useState<CollectionAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    try {
      const [debtorsRes, actionsRes] = await Promise.all([
        apiClient.get(`/fees/debtors/school/${schoolId}`),
        apiClient.get(`/fees/collections/school/${schoolId}`),
      ]);
      const rawD = unwrapResponse(debtorsRes);
      const debtors: RawDebtor[] = Array.isArray(rawD)
        ? rawD
        : ((rawD as Record<string, unknown>).debtors ??
            (rawD as Record<string, unknown>).data ??
            []) as RawDebtor[];
      setData(debtors.map(mapDebtorEntry));

      const rawA = unwrapResponse(actionsRes);
      const actionList: CollectionAction[] = Array.isArray(rawA)
        ? rawA
        : ((rawA as Record<string, unknown>).actions ??
            (rawA as Record<string, unknown>).data ??
            []) as CollectionAction[];
      setActions(actionList);
    } catch {
      console.error('Failed to load debtors report');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, actions, loading, refetch: fetchData, schoolId };
}
