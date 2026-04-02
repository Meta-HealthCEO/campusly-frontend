'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { WalletTransaction } from '@/types';

interface StudentWalletRow {
  studentId: string;
  studentName: string;
  walletId: string | null;
  wristbandId: string;
  balance: number;
  dailyLimit: number;
  isActive: boolean;
  lastTopUp: string | undefined;
  hasWallet: boolean;
}

function getStudentName(s: Record<string, unknown>): string {
  // userId is populated as an object by the backend
  const u = s.user ?? s.userId;
  if (typeof u === 'object' && u !== null) {
    const user = u as { firstName?: string; lastName?: string };
    if (user.firstName) return `${user.firstName} ${user.lastName ?? ''}`.trim();
  }
  const first = (s.firstName as string) ?? '';
  const last = (s.lastName as string) ?? '';
  return `${first} ${last}`.trim() || 'Unknown';
}

function extractApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string; message?: string } } };
  return e?.response?.data?.error ?? e?.response?.data?.message ?? fallback;
}

export function useAdminWallets() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<StudentWalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/students');
      const raw = unwrapResponse(response);
      const rawObj = raw as Record<string, unknown>;
      const studentArr = (rawObj as Record<string, unknown>).students ?? (rawObj as Record<string, unknown>).data;
      const students: Record<string, unknown>[] = Array.isArray(raw)
        ? raw
        : Array.isArray(studentArr) ? studentArr as Record<string, unknown>[] : [];

      // Fetch wallets for each student in parallel
      const walletResults = await Promise.allSettled(
        students.map((s) => {
          const sid = (s._id as string) ?? (s.id as string);
          return apiClient.get(`/wallets/student/${sid}`);
        })
      );

      const mapped: StudentWalletRow[] = students.map((s, i) => {
        const sid = (s._id as string) ?? (s.id as string) ?? '';
        const name = getStudentName(s);
        const walletRes = walletResults[i];

        if (walletRes.status === 'fulfilled') {
          const w = unwrapResponse(walletRes.value);
          return {
            studentId: sid,
            studentName: name,
            walletId: (w._id as string) ?? (w.id as string) ?? null,
            wristbandId: (w.wristbandId as string) ?? '-',
            balance: (w.balance as number) ?? 0,
            dailyLimit: (w.dailyLimit as number) ?? 10000,
            isActive: (w.isActive as boolean) ?? false,
            lastTopUp: (w.lastTopUp as string) ?? undefined,
            hasWallet: true,
          };
        }

        return {
          studentId: sid,
          studentName: name,
          walletId: null,
          wristbandId: '-',
          balance: 0,
          dailyLimit: 0,
          isActive: false,
          lastTopUp: undefined,
          hasWallet: false,
        };
      });

      setRows(mapped);
    } catch {
      console.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const createWallet = useCallback(async (studentId: string) => {
    if (!user?.schoolId) return;
    try {
      await apiClient.post('/wallets', {
        studentId,
        schoolId: user.schoolId,
      });
      toast.success('Wallet created successfully!');
      await fetchStudents();
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to create wallet'));
    }
  }, [user?.schoolId, fetchStudents]);

  const loadMoney = useCallback(async (walletId: string, amountRands: number) => {
    try {
      await apiClient.post(`/wallets/${walletId}/load`, {
        amount: Math.round(amountRands * 100),
        description: 'Admin top-up',
      });
      toast.success('Wallet topped up successfully!');
      await fetchStudents();
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to load money'));
    }
  }, [fetchStudents]);

  const deductMoney = useCallback(async (walletId: string, amountRands: number, description: string) => {
    try {
      await apiClient.post(`/wallets/${walletId}/deduct`, {
        amount: Math.round(amountRands * 100),
        description,
      });
      toast.success('Money deducted successfully!');
      await fetchStudents();
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to deduct money'));
    }
  }, [fetchStudents]);

  const updateDailyLimit = useCallback(async (walletId: string, limitRands: number) => {
    try {
      await apiClient.patch(`/wallets/${walletId}/daily-limit`, {
        dailyLimit: Math.round(limitRands * 100),
      });
      toast.success('Daily limit updated!');
      await fetchStudents();
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to update daily limit'));
    }
  }, [fetchStudents]);

  const linkWristband = useCallback(async (studentId: string, wristbandId: string) => {
    try {
      await apiClient.post('/wallets/wristband/link', {
        wristbandId,
        studentId,
      });
      toast.success('Wristband linked successfully!');
      await fetchStudents();
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to link wristband'));
    }
  }, [fetchStudents]);

  const unlinkWristband = useCallback(async (wristbandId: string) => {
    try {
      await apiClient.post(`/wallets/wristband/${wristbandId}/unlink`);
      toast.success('Wristband unlinked!');
      await fetchStudents();
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to unlink wristband'));
    }
  }, [fetchStudents]);

  const fetchTransactions = useCallback(async (walletId: string) => {
    setTxLoading(true);
    setTransactions([]);
    try {
      const response = await apiClient.get(`/wallets/${walletId}/transactions`);
      const raw = unwrapResponse(response);
      const txns = (raw as Record<string, unknown>).transactions
        ?? (Array.isArray(raw) ? raw : (raw as Record<string, unknown>).data ?? []);
      const mapped: WalletTransaction[] = (txns as Record<string, unknown>[]).map((t) => ({
        id: (t._id as string) ?? (t.id as string),
        walletId: t.walletId as string,
        type: (t.type === 'load' ? 'topup' : t.type) as WalletTransaction['type'],
        amount: t.amount as number,
        balance: (t.balanceAfter as number) ?? (t.balance as number) ?? 0,
        description: (t.description as string) ?? '',
        reference: (t.reference as string) ?? undefined,
        createdAt: (t.createdAt as string) ?? '',
      }));
      setTransactions(mapped);
    } catch {
      console.error('Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  }, []);

  return {
    rows,
    loading,
    transactions,
    txLoading,
    createWallet,
    loadMoney,
    deductMoney,
    updateDailyLimit,
    linkWristband,
    unlinkWristband,
    fetchTransactions,
    refresh: fetchStudents,
  };
}

export type { StudentWalletRow };
