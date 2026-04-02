import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, mapId } from '@/lib/api-helpers';
import { useCurrentParent } from './useCurrentParent';
import type { Wallet, WalletTransaction } from '@/types';

export interface ChildWallet {
  childId: string;
  childFirstName: string;
  childLastName: string;
  wallet: Wallet | null;
  transactions: WalletTransaction[];
}

interface ParentWalletsResult {
  childWallets: ChildWallet[];
  loading: boolean;
  loadMoney: (walletId: string, childId: string, amountCents: number) => Promise<void>;
}

export function useParentWallets(): ParentWalletsResult {
  const { children, loading: parentLoading } = useCurrentParent();
  const [childWallets, setChildWallets] = useState<ChildWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (children.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const results: ChildWallet[] = [];
      for (const child of children) {
        const u = child.user ?? (child.userId as unknown as { firstName?: string; lastName?: string });
        const firstName = (typeof u === 'object' && u !== null ? u.firstName : undefined) ?? child.firstName ?? '';
        const lastName = (typeof u === 'object' && u !== null ? u.lastName : undefined) ?? child.lastName ?? '';

        let wallet: Wallet | null = null;
        let txns: WalletTransaction[] = [];
        try {
          const wRes = await apiClient.get(`/wallets/student/${child.id}`);
          const wRaw = unwrapResponse(wRes);
          wallet = wRaw.wallet ?? wRaw;
          if (wallet) {
            wallet = { ...wallet, id: (wallet as unknown as { _id?: string })._id ?? wallet.id };
          }
        } catch { /* no wallet */ }

        if (wallet?.id) {
          try {
            const tRes = await apiClient.get(`/wallets/${wallet.id}/transactions`);
            txns = unwrapList<WalletTransaction>(tRes);
          } catch { /* no transactions */ }
        }

        results.push({ childId: child.id, childFirstName: firstName, childLastName: lastName, wallet, transactions: txns });
      }
      setChildWallets(results);
    } catch {
      console.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [children]);

  useEffect(() => {
    if (parentLoading) return;
    fetchData();
  }, [parentLoading, fetchData]);

  const loadMoney = async (walletId: string, childId: string, amountCents: number) => {
    await apiClient.post(`/wallets/${walletId}/load`, {
      amount: amountCents,
      description: 'Parent top-up',
    });
    // Refresh this child's wallet
    try {
      const refreshRes = await apiClient.get(`/wallets/student/${childId}`);
      const d = unwrapResponse(refreshRes);
      const refreshed: Wallet = d.wallet ?? d;
      const normalized = { ...refreshed, id: (refreshed as unknown as { _id?: string })._id ?? refreshed.id };
      setChildWallets((prev) => prev.map((cw) =>
        cw.childId === childId ? { ...cw, wallet: normalized } : cw
      ));
    } catch { /* ignore refresh error */ }
  };

  return {
    childWallets,
    loading: loading || parentLoading,
    loadMoney,
  };
}
