'use client';

import { Wallet, CreditCard, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { mockWallets, mockStudents } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/utils';

interface WalletRow {
  id: string;
  studentName: string;
  wristbandId: string;
  balance: number;
  dailyLimit: number;
  isActive: boolean;
  lastTopUp: string | undefined;
}

const walletData: WalletRow[] = mockWallets.map((w) => {
  const student = mockStudents.find((s) => s.id === w.studentId);
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

const totalLoaded = mockWallets.reduce((sum, w) => sum + w.balance, 0);
const totalBalance = mockWallets.reduce((sum, w) => sum + w.balance, 0);
const activeWallets = mockWallets.filter((w) => w.isActive).length;

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

export default function WalletPage() {
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
