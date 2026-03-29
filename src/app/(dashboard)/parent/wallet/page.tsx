'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Wallet, Plus, CreditCard, ShieldCheck, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mockStudents, mockWallets, mockWalletTransactions } from '@/lib/mock-data';
import type { WalletTransaction } from '@/types';

const parentChildren = mockStudents.slice(0, 2);

const transactionColumns: ColumnDef<WalletTransaction, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.createdAt, 'dd MMM yyyy HH:mm'),
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.type;
      const styles: Record<string, string> = {
        topup: 'bg-emerald-100 text-emerald-800',
        purchase: 'bg-blue-100 text-blue-800',
        refund: 'bg-amber-100 text-amber-800',
      };
      return (
        <Badge variant="secondary" className={styles[type] ?? ''}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const amount = row.original.amount;
      return (
        <span className={amount >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
          {amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(amount))}
        </span>
      );
    },
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    cell: ({ row }) => formatCurrency(row.original.balance),
  },
];

export default function WalletPage() {
  const [loadAmount, setLoadAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  const childWallets = parentChildren.map((child) => {
    const wallet = mockWallets.find((w) => w.studentId === child.id);
    const transactions = mockWalletTransactions.filter(
      (t) => t.walletId === wallet?.id
    );
    return { child, wallet, transactions };
  });

  const totalBalance = childWallets.reduce(
    (sum, cw) => sum + (cw.wallet?.balance ?? 0),
    0
  );

  const handleLoadMoney = (walletId: string) => {
    // In production, this would call the API
    setLoadAmount('');
    setDialogOpen(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet Management"
        description="Manage your children's school wallets and view transaction history."
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Balance"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          description="Across all children"
        />
        <StatCard
          title="Active Wallets"
          value={String(childWallets.filter((cw) => cw.wallet?.isActive).length)}
          icon={CreditCard}
          description="Linked wallets"
        />
        <StatCard
          title="Daily Limit"
          value={formatCurrency(childWallets[0]?.wallet?.dailyLimit ?? 0)}
          icon={ShieldCheck}
          description="Per child per day"
        />
      </div>

      {/* Per-child wallet tabs */}
      <Tabs defaultValue={parentChildren[0]?.id ?? ''}>
        <TabsList>
          {parentChildren.map((child) => (
            <TabsTrigger key={child.id} value={child.id}>
              {child.user.firstName} {child.user.lastName}
            </TabsTrigger>
          ))}
        </TabsList>

        {childWallets.map(({ child, wallet, transactions }) => (
          <TabsContent key={child.id} value={child.id} className="space-y-6">
            {/* Balance Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(wallet?.balance ?? 0)}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Wristband: <span className="font-medium text-foreground">{wallet?.wristbandId ?? 'N/A'}</span>
                      </span>
                      {wallet?.lastTopUp && (
                        <span>
                          Last top-up: {formatDate(wallet.lastTopUp)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Dialog
                    open={dialogOpen === child.id}
                    onOpenChange={(open) =>
                      setDialogOpen(open ? child.id : null)
                    }
                  >
                    <DialogTrigger
                      render={<Button className="gap-2" />}
                    >
                      <Plus className="h-4 w-4" />
                      Load Money
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Load Money - {child.user.firstName}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount (ZAR)</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="e.g. 100.00"
                            value={loadAmount}
                            onChange={(e) => setLoadAmount(e.target.value)}
                            min="10"
                            step="10"
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum top-up: R10.00
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {[50, 100, 200, 500].map((preset) => (
                            <Button
                              key={preset}
                              variant="outline"
                              size="sm"
                              onClick={() => setLoadAmount(String(preset))}
                            >
                              R{preset}
                            </Button>
                          ))}
                        </div>
                        <Button
                          className="w-full"
                          disabled={
                            !loadAmount || parseFloat(loadAmount) < 10
                          }
                          onClick={() =>
                            handleLoadMoney(wallet?.id ?? '')
                          }
                        >
                          Load {loadAmount ? `R${parseFloat(loadAmount).toFixed(2)}` : 'Money'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Spending Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spending Limits</CardTitle>
                <CardDescription>
                  Control daily spending for {child.user.firstName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Daily Limit</p>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(wallet?.dailyLimit ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum spend per day
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-medium">Wallet Status</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        wallet?.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {wallet?.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {wallet?.isActive
                        ? 'Wallet is enabled for purchases'
                        : 'Wallet is currently disabled'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transaction History</CardTitle>
                <CardDescription>
                  Recent wallet transactions for {child.user.firstName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <DataTable
                    columns={transactionColumns}
                    data={transactions}
                    searchKey="description"
                    searchPlaceholder="Search transactions..."
                  />
                ) : (
                  <EmptyState
                    icon={Wallet}
                    title="No transactions yet"
                    description="Transactions will appear here once the wallet is used."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
