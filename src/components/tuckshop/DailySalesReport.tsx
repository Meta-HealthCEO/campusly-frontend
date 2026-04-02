'use client';

import { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { useTuckShopDailySales } from '@/hooks/useTuckShop';

interface DailySalesReportProps {
  schoolId: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wallet: 'Wallet',
  wristband: 'Wristband',
  cash: 'Cash',
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  wallet: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  wristband: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cash: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export function DailySalesReport({ schoolId }: DailySalesReportProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const { salesData, loading, fetchSales } = useTuckShopDailySales(schoolId);

  useEffect(() => {
    fetchSales(date);
  }, [date, fetchSales]);

  const avgTransaction = salesData && salesData.orderCount > 0
    ? Math.round(salesData.totalSales / salesData.orderCount)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label>Select Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>
        {loading && <LoadingSpinner size="sm" />}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(salesData?.totalSales ?? 0)}
          icon={DollarSign}
          description={date}
        />
        <StatCard
          title="Total Orders"
          value={String(salesData?.orderCount ?? 0)}
          icon={ShoppingBag}
          description={date}
        />
        <StatCard
          title="Avg. Transaction"
          value={formatCurrency(avgTransaction)}
          icon={TrendingUp}
          description={salesData?.orderCount ? `${salesData.orderCount} orders` : 'No orders'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {salesData?.byPaymentMethod && salesData.byPaymentMethod.length > 0 ? (
            <div className="space-y-3">
              {salesData.byPaymentMethod.map((pm) => (
                <div key={pm.paymentMethod} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Badge className={PAYMENT_METHOD_COLORS[pm.paymentMethod] ?? ''}>
                      {PAYMENT_METHOD_LABELS[pm.paymentMethod] ?? pm.paymentMethod}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {pm.orderCount} order{pm.orderCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="font-semibold">{formatCurrency(pm.totalSales)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No sales data for this date.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
