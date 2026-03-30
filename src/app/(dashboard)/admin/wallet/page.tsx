'use client';

import { useState, useEffect } from 'react';
import { Wallet, CreditCard, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { mockWallets, mockStudents } from '@/lib/mock-data';
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

function buildWalletRows(wallets: typeof mockWallets): WalletRow[] {
  return wallets.map((w) => {
    const student = mockStudents.find((s) => s.id === (w.studentId));
    return {
      id: w.id,
      studentName: student ? `${student.user.firstName} ${student.user.lastName}` : 'Unknown',
      wristbandId: w.wristbandId || '-',
      balance: w.balance,
      dailyLimit: w.dailyLimit,
      isActive: w.isActive,
      lastTopUp: w.lastTopUp,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildApiWalletRows(wallets: any[]): WalletRow[] {
  return wallets.map((w) => ({
    id: w.id,
    studentName:
      w.studentName ||
      (w.student
        ? `${w.student.user?.firstName ?? w.student.firstName ?? ''} ${w.student.user?.lastName ?? w.student.lastName ?? ''}`.trim()
        : 'Unknown'),
    wristbandId: w.wristbandId || w.wristband_id || '-',
    balance: w.balance ?? 0,
    dailyLimit: w.dailyLimit ?? w.daily_limit ?? 0,
    isActive: w.isActive ?? w.is_active ?? false,
    lastTopUp: w.lastTopUp || w.last_top_up || undefined,
  }));
}

export default function WalletPage() {
  const [walletData, setWalletData] = useState<WalletRow[]>(() => buildWalletRows(mockWallets));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.get('/wallet');
        if (response.data) {
          const raw = response.data.data ?? response.data;
          if (Array.isArray(raw)) {
            setWalletData(buildApiWalletRows(raw));
          }
        }
      } catch (error) {
        console.warn('API unavailable, using mock data');
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
