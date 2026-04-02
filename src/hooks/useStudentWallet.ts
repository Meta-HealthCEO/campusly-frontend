import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { useCurrentStudent } from './useCurrentStudent';
import type { Wallet, WalletTransaction, TuckshopItem } from '@/types';

interface StudentWalletResult {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  menuItems: TuckshopItem[];
  loading: boolean;
}

export function useStudentWallet(): StudentWalletResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [menuItems, setMenuItems] = useState<TuckshopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) {
      if (!studentLoading) setLoading(false);
      return;
    }

    const currentStudent = student;
    async function fetchData() {
      try {
        const sid = currentStudent._id ?? currentStudent.id;
        const [walletRes, menuRes] = await Promise.allSettled([
          apiClient.get(`/wallets/student/${sid}`),
          apiClient.get('/tuck-shop/menu'),
        ]);

        if (walletRes.status === 'fulfilled' && walletRes.value.data) {
          const d = unwrapResponse(walletRes.value);
          setWallet(d.wallet ?? d);
          // If wallet has an ID, fetch transactions
          const walletId = d.wallet?.id ?? d.wallet?._id ?? d.id ?? d._id;
          if (walletId) {
            try {
              const txRes = await apiClient.get(`/wallets/${walletId}/transactions`);
              setTransactions(unwrapList<WalletTransaction>(txRes));
            } catch { /* no transactions */ }
          }
        }
        if (menuRes.status === 'fulfilled' && menuRes.value.data) {
          setMenuItems(unwrapList<TuckshopItem>(menuRes.value));
        }
      } catch {
        console.error('Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [student, studentLoading]);

  return { wallet, transactions, menuItems, loading: studentLoading || loading };
}
