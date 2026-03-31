'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  ShoppingBag,
  CreditCard,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Wallet as WalletType, WalletTransaction, TuckshopItem } from '@/types';

const transactionIcons: Record<string, typeof ArrowUpCircle> = {
  topup: ArrowUpCircle,
  purchase: ArrowDownCircle,
  refund: RotateCcw,
};

const transactionColors: Record<string, string> = {
  topup: 'text-emerald-600',
  purchase: 'text-red-600',
  refund: 'text-blue-600',
};

export default function StudentWalletPage() {
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [menuItems, setMenuItems] = useState<TuckshopItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Find current student
        const studentsRes = await apiClient.get('/students');
        const studentsData = studentsRes.data.data ?? studentsRes.data;
        const studentsList = Array.isArray(studentsData) ? studentsData : studentsData.data ?? [];
        const me = studentsList.find((s: any) => s.userId === user?.id || s.user?._id === user?.id || s.user?.id === user?.id);

        if (me) {
          const sid = me.id ?? me._id;
          const [walletRes, menuRes] = await Promise.allSettled([
            apiClient.get(`/wallets/student/${sid}`),
            apiClient.get('/tuck-shop/menu'),
          ]);

          if (walletRes.status === 'fulfilled' && walletRes.value.data) {
            const d = walletRes.value.data.data ?? walletRes.value.data;
            setWallet(d.wallet ?? d);
            // If wallet has an ID, fetch transactions
            const walletId = d.wallet?.id ?? d.wallet?._id ?? d.id ?? d._id;
            if (walletId) {
              try {
                const txRes = await apiClient.get(`/wallets/${walletId}/transactions`);
                const txData = txRes.data.data ?? txRes.data;
                setTransactions(Array.isArray(txData) ? txData : txData.data ?? []);
              } catch { /* no transactions */ }
            }
          }
          if (menuRes.status === 'fulfilled' && menuRes.value.data) {
            const d = menuRes.value.data.data ?? menuRes.value.data;
            setMenuItems(Array.isArray(d) ? d : d.data ?? []);
          }
        }
      } catch {
        console.error('Failed to load wallet data');
      }
    }
    if (user?.id) fetchData();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Wallet"
        description="Manage your tuck shop wallet and view transactions"
      />

      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100">Available Balance</p>
              <p className="text-4xl font-bold mt-1">
                {wallet ? formatCurrency(wallet.balance) : 'R0.00'}
              </p>
              <p className="text-sm text-blue-200 mt-2">
                Daily limit: {wallet ? formatCurrency(wallet.dailyLimit) : 'R0.00'}
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20">
              <CreditCard className="h-8 w-8" />
            </div>
          </div>
          {wallet?.wristbandId && (
            <div className="mt-4 rounded-lg bg-white/10 px-3 py-2">
              <p className="text-xs text-blue-200">Wristband ID: {wallet.wristbandId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="menu">Tuck Shop Menu</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          {transactions.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No Transactions"
              description="Your transaction history will appear here."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {transactions.map((tx) => {
                    const TxIcon = transactionIcons[tx.type] ?? ArrowDownCircle;
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <TxIcon className={`h-5 w-5 ${transactionColors[tx.type] ?? ''}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.createdAt, 'dd MMM yyyy, HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bal: {formatCurrency(tx.balance)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="menu">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menuItems
              .filter((item) => item.isAvailable)
              .map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">{item.name}</h3>
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(item.price)}
                      </span>
                      {item.allergens.length > 0 && (
                        <div className="flex gap-1">
                          {item.allergens.map((allergen) => (
                            <Badge key={allergen} variant="outline" className="text-xs">
                              {allergen}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
