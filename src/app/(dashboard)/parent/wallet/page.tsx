'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Wallet, Plus, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useParentWallets } from '@/hooks/useParentWallets';
import type { WalletTransaction } from '@/types';

const transactionColumns: ColumnDef<WalletTransaction, unknown>[] = [
  {
    accessorKey: 'createdAt', header: 'Date',
    cell: ({ row }) => formatDate(row.original.createdAt, 'dd MMM yyyy HH:mm'),
  },
  { accessorKey: 'description', header: 'Description' },
  {
    accessorKey: 'type', header: 'Type',
    cell: ({ row }) => {
      const type = row.original.type;
      const styles: Record<string, string> = {
        topup: 'bg-emerald-100 text-emerald-800',
        load: 'bg-emerald-100 text-emerald-800',
        purchase: 'bg-blue-100 text-blue-800',
        refund: 'bg-amber-100 text-amber-800',
      };
      const label = (type as string) === 'load' ? 'Top Up' : type.charAt(0).toUpperCase() + type.slice(1);
      return <Badge variant="secondary" className={styles[type] ?? ''}>{label}</Badge>;
    },
  },
  {
    accessorKey: 'amount', header: 'Amount',
    cell: ({ row }) => {
      const amount = row.original.amount;
      const isPurchase = row.original.type === 'purchase';
      return (
        <span className={isPurchase ? 'text-destructive font-medium' : 'text-emerald-600 font-medium'}>
          {isPurchase ? '-' : '+'}{formatCurrency(amount)}
        </span>
      );
    },
  },
  {
    accessorKey: 'balance', header: 'Balance',
    cell: ({ row }) => formatCurrency(row.original.balance),
  },
];

export default function WalletPage() {
  const { children } = useCurrentParent();
  const { childWallets, loading, loadMoney } = useParentWallets();
  const [loadAmount, setLoadAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  const totalBalance = childWallets.reduce((sum, cw) => sum + (cw.wallet?.balance ?? 0), 0);

  const handleLoadMoney = async (walletId: string, childId: string) => {
    const amount = parseFloat(loadAmount);
    if (!amount || amount < 10) return;
    try {
      await loadMoney(walletId, childId, Math.round(amount * 100));
      toast.success('Wallet topped up successfully!');
    } catch {
      toast.error('Failed to load money. Please try again.');
    }
    setLoadAmount('');
    setDialogOpen(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Wallet Management" description="Manage your children's school wallets and view transaction history." />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Balance" value={formatCurrency(totalBalance)} icon={Wallet} description="Across all children" />
        <StatCard title="Active Wallets" value={String(childWallets.filter((cw) => cw.wallet?.isActive).length)} icon={CreditCard} description="Linked wallets" />
        <StatCard title="Daily Limit" value={formatCurrency(childWallets[0]?.wallet?.dailyLimit ?? 0)} icon={ShieldCheck} description="Per child per day" />
      </div>

      <Tabs defaultValue={children[0]?.id ?? ''}>
        <TabsList>
          {childWallets.map((cw) => (
            <TabsTrigger key={cw.childId} value={cw.childId}>
              {cw.childFirstName} {cw.childLastName}
            </TabsTrigger>
          ))}
        </TabsList>

        {childWallets.map((cw) => (
          <TabsContent key={cw.childId} value={cw.childId} className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-3xl font-bold">{formatCurrency(cw.wallet?.balance ?? 0)}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Wristband: <span className="font-medium text-foreground">{cw.wallet?.wristbandId ?? 'N/A'}</span></span>
                      {cw.wallet?.lastTopUp && <span>Last top-up: {formatDate(cw.wallet.lastTopUp)}</span>}
                    </div>
                  </div>
                  <Dialog open={dialogOpen === cw.childId} onOpenChange={(open) => setDialogOpen(open ? cw.childId : null)}>
                    <DialogTrigger render={<Button className="gap-2" />}>
                      <Plus className="h-4 w-4" />Load Money
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Load Money - {cw.childFirstName}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount (ZAR)</Label>
                          <Input id="amount" type="number" placeholder="e.g. 100.00" value={loadAmount} onChange={(e) => setLoadAmount(e.target.value)} min="10" step="10" />
                          <p className="text-xs text-muted-foreground">Minimum top-up: R10.00</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[50, 100, 200, 500].map((preset) => (
                            <Button key={preset} variant="outline" size="sm" onClick={() => setLoadAmount(String(preset))}>R{preset}</Button>
                          ))}
                        </div>
                        <Button className="w-full" disabled={!loadAmount || parseFloat(loadAmount) < 10} onClick={() => handleLoadMoney(cw.wallet?.id ?? '', cw.childId)}>
                          Load {loadAmount ? `R${parseFloat(loadAmount).toFixed(2)}` : 'Money'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spending Limits</CardTitle>
                <CardDescription>Control daily spending for {cw.childFirstName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-primary" /><p className="text-sm font-medium">Daily Limit</p></div>
                    <p className="text-2xl font-bold">{formatCurrency(cw.wallet?.dailyLimit ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Maximum spend per day</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2"><Wallet className="h-4 w-4 text-emerald-600" /><p className="text-sm font-medium">Wallet Status</p></div>
                    <Badge variant="secondary" className={cw.wallet?.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-destructive/10 text-destructive'}>
                      {cw.wallet?.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">{cw.wallet?.isActive ? 'Wallet is enabled for purchases' : 'Wallet is currently disabled'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transaction History</CardTitle>
                <CardDescription>Recent wallet transactions for {cw.childFirstName}</CardDescription>
              </CardHeader>
              <CardContent>
                {cw.transactions.length > 0 ? (
                  <DataTable columns={transactionColumns} data={cw.transactions} searchKey="description" searchPlaceholder="Search transactions..." />
                ) : (
                  <EmptyState icon={Wallet} title="No transactions yet" description="Transactions will appear here once the wallet is used." />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
