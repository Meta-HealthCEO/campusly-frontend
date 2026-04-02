'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  ShoppingBag,
  CreditCard,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useStudentWallet } from '@/hooks/useStudentWallet';

const transactionIcons: Record<string, typeof ArrowUpCircle> = {
  topup: ArrowUpCircle,
  load: ArrowUpCircle,
  purchase: ArrowDownCircle,
  refund: RotateCcw,
};

const transactionColors: Record<string, string> = {
  topup: 'text-emerald-600',
  load: 'text-emerald-600',
  purchase: 'text-destructive',
  refund: 'text-blue-600',
};

export default function StudentWalletPage() {
  const { wallet, transactions, menuItems, loading } = useStudentWallet();

  if (loading) return <LoadingSpinner />;

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
                          <p className={`text-sm font-semibold ${tx.type === 'purchase' ? 'text-destructive' : 'text-emerald-600'}`}>
                            {tx.type === 'purchase' ? '-' : '+'}{formatCurrency(tx.amount)}
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
                        <div className="flex flex-wrap gap-1 max-w-xs">
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
