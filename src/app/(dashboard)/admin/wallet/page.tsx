'use client';

import { useState, useEffect } from 'react';
import { Wallet, CreditCard, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import apiClient from '@/lib/api-client';

interface WalletRow {
  id: string;
  studentName: string;
  wristbandId: string;
  balance: number;
  dailyLimit: number;
  isActive: boolean;
  lastTopUp: string | undefined;
}

const columns: ColumnDef<WalletRow>[] = [
  {
    accessorKey: 'studentName',
    header: 'Student',
  },
  {
    accessorKey: 'wristbandId',
    header: 'Wristband ID',
  },
  {
    id: 'balance',
    header: 'Balance',
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.original.balance)}</span>
    ),
  },
  {
    id: 'dailyLimit',
    header: 'Daily Limit',
    cell: ({ row }) => formatCurrency(row.original.dailyLimit),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        className={
          row.original.isActive
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
      >
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'lastTopUp',
    header: 'Last Top-up',
    cell: ({ row }) => (row.original.lastTopUp ? formatDate(row.original.lastTopUp) : '-'),
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildApiWalletRows(students: any[]): WalletRow[] {
  return students
    .filter((s) => s.walletId)
    .map((s) => ({
      id: s.walletId || s.id,
      studentName: `${s.user?.firstName ?? s.firstName ?? ''} ${s.user?.lastName ?? s.lastName ?? ''}`.trim() || 'Unknown',
      wristbandId: '-',
      balance: s.wallet?.balance ?? 0,
      dailyLimit: s.wallet?.dailyLimit ?? s.wallet?.daily_limit ?? 0,
      isActive: s.wallet?.isActive ?? false,
      lastTopUp: s.wallet?.lastTopUp ?? undefined,
    }));
}

export default function WalletPage() {
  const [walletData, setWalletData] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.get('/students');
        if (response.data) {
          const raw = response.data.data ?? response.data;
          const arr = Array.isArray(raw) ? raw : raw.data ?? [];
          setWalletData(buildApiWalletRows(arr));
        }
      } catch {
        console.error('Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalLoaded = walletData.reduce((sum, w) => sum + w.balance, 0);
  const totalBalance = walletData.reduce((sum, w) => sum + w.balance, 0);
  const activeWallets = walletData.filter((w) => w.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet Management" description="Manage student wallets and wristbands" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Loaded" value={formatCurrency(totalLoaded)} icon={CreditCard} />
        <StatCard title="Total Balance" value={formatCurrency(totalBalance)} icon={Wallet} />
        <StatCard title="Active Wallets" value={activeWallets.toString()} icon={Users} />
      </div>

      <DataTable columns={columns} data={walletData} searchKey="studentName" searchPlaceholder="Search by student..." />
    </div>
  );
}
