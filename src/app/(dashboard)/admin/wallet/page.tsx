'use client';

import { useState } from 'react';
import { Wallet, CreditCard, Users, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAdminWallets, type StudentWalletRow } from '@/hooks/useAdminWallets';
import {
  CreateWalletDialog,
  LoadMoneyDialog,
  DeductMoneyDialog,
  DailyLimitDialog,
} from '@/components/wallet/WalletActionDialogs';
import {
  LinkWristbandDialog,
  UnlinkWristbandDialog,
} from '@/components/wallet/WristbandDialogs';
import { WalletTransactionsDialog } from '@/components/wallet/WalletTransactionsDialog';

type DialogType = 'create' | 'load' | 'deduct' | 'dailyLimit' | 'linkWristband' | 'unlinkWristband' | 'transactions';

interface DialogState {
  type: DialogType | null;
  row: StudentWalletRow | null;
}

export default function WalletPage() {
  const {
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
  } = useAdminWallets();

  const [dialog, setDialog] = useState<DialogState>({ type: null, row: null });

  const openDialog = (type: DialogType, row: StudentWalletRow) => setDialog({ type, row });
  const closeDialog = () => setDialog({ type: null, row: null });

  const handleViewTransactions = (row: StudentWalletRow) => {
    if (row.walletId) {
      fetchTransactions(row.walletId);
      openDialog('transactions', row);
    }
  };

  const walletRows = rows.filter((r) => r.hasWallet);
  const noWalletRows = rows.filter((r) => !r.hasWallet);

  const totalLoaded = walletRows.reduce((sum, w) => sum + w.balance, 0);
  const totalBalance = walletRows.reduce((sum, w) => sum + w.balance, 0);
  const activeWallets = walletRows.filter((w) => w.isActive).length;

  const columns: ColumnDef<StudentWalletRow>[] = [
    { accessorKey: 'studentName', header: 'Student' },
    { accessorKey: 'wristbandId', header: 'Wristband ID' },
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
              : 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive'
          }
        >
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'lastTopUp',
      header: 'Last Top-up',
      cell: ({ row }) =>
        row.original.lastTopUp ? formatDate(row.original.lastTopUp) : '-',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <WalletRowActions row={row.original} onAction={openDialog} onViewTx={handleViewTransactions} />,
    },
  ];

  const noWalletColumns: ColumnDef<StudentWalletRow>[] = [
    { accessorKey: 'studentName', header: 'Student' },
    {
      id: 'action',
      header: '',
      cell: ({ row }) => (
        <Button size="sm" onClick={() => openDialog('create', row.original)}>
          Create Wallet
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet Management" description="Manage student wallets and wristbands" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Loaded" value={formatCurrency(totalLoaded)} icon={CreditCard} />
        <StatCard title="Total Balance" value={formatCurrency(totalBalance)} icon={Wallet} />
        <StatCard title="Active Wallets" value={activeWallets.toString()} icon={Users} />
      </div>

      <DataTable
        columns={columns}
        data={walletRows}
        searchKey="studentName"
        searchPlaceholder="Search by student..."
      />

      {noWalletRows.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Students without wallets ({noWalletRows.length})
          </h3>
          <DataTable
            columns={noWalletColumns}
            data={noWalletRows}
            searchKey="studentName"
            searchPlaceholder="Search students..."
          />
        </div>
      )}

      {dialog.row && (
        <>
          <CreateWalletDialog
            open={dialog.type === 'create'}
            onOpenChange={(o) => { if (!o) closeDialog(); }}
            studentName={dialog.row.studentName}
            onConfirm={() => createWallet(dialog.row?.studentId ?? '')}
          />
          <LoadMoneyDialog
            open={dialog.type === 'load'}
            onOpenChange={(o) => { if (!o) closeDialog(); }}
            studentName={dialog.row.studentName}
            onConfirm={(amount) => loadMoney(dialog.row?.walletId ?? '', amount)}
          />
          <DeductMoneyDialog
            open={dialog.type === 'deduct'}
            onOpenChange={(o) => { if (!o) closeDialog(); }}
            studentName={dialog.row.studentName}
            currentBalance={dialog.row.balance}
            onConfirm={(amount, desc) => deductMoney(dialog.row?.walletId ?? '', amount, desc)}
          />
          <DailyLimitDialog
            open={dialog.type === 'dailyLimit'}
            onOpenChange={(o) => { if (!o) closeDialog(); }}
            studentName={dialog.row.studentName}
            currentLimit={dialog.row.dailyLimit}
            onConfirm={(limit) => updateDailyLimit(dialog.row?.walletId ?? '', limit)}
          />
          <LinkWristbandDialog
            open={dialog.type === 'linkWristband'}
            onOpenChange={(o) => { if (!o) closeDialog(); }}
            studentName={dialog.row.studentName}
            onConfirm={(wbId) => linkWristband(dialog.row?.studentId ?? '', wbId)}
          />
          <UnlinkWristbandDialog
            open={dialog.type === 'unlinkWristband'}
            onOpenChange={(o) => { if (!o) closeDialog(); }}
            studentName={dialog.row.studentName}
            wristbandId={dialog.row.wristbandId}
            onConfirm={() => unlinkWristband(dialog.row?.wristbandId ?? '')}
          />
          <WalletTransactionsDialog
            open={dialog.type === 'transactions'}
            onOpenChange={(o) => { if (!o) closeDialog(); }}
            studentName={dialog.row.studentName}
            transactions={transactions}
            loading={txLoading}
          />
        </>
      )}
    </div>
  );
}

// ---- Row Actions Dropdown ----

interface WalletRowActionsProps {
  row: StudentWalletRow;
  onAction: (type: DialogType, row: StudentWalletRow) => void;
  onViewTx: (row: StudentWalletRow) => void;
}

function WalletRowActions({ row, onAction, onViewTx }: WalletRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More options" />}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAction('load', row)}>
          Load Money
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('deduct', row)}>
          Deduct Money
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('dailyLimit', row)}>
          Update Daily Limit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onViewTx(row)}>
          View Transactions
        </DropdownMenuItem>
        {row.wristbandId === '-' ? (
          <DropdownMenuItem onClick={() => onAction('linkWristband', row)}>
            Link Wristband
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onAction('unlinkWristband', row)}>
            Unlink Wristband
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
