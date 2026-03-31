'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BarChartComponent, LineChartComponent } from '@/components/charts';
import { DateRangeFilter } from '@/components/reports/DateRangeFilter';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatCurrency } from '@/lib/utils';
import { useReports } from '@/hooks/useReports';
import type { TuckShopSalesEntry } from '@/hooks/useReports';

type PeriodType = 'daily' | 'weekly' | 'monthly';

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function formatPeriodLabel(entry: TuckShopSalesEntry, period: PeriodType): string {
  const p = entry.period;
  if (period === 'daily' && p.month && p.day) {
    return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  }
  if (period === 'weekly' && p.week) {
    return `${p.year} W${p.week}`;
  }
  if (period === 'monthly' && p.month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[p.month - 1]} ${p.year}`;
  }
  return `${p.year}`;
}

export default function TuckShopSalesReportPage() {
  const router = useRouter();
  const { loading, fetchTuckShopSales } = useReports();
  const [data, setData] = useState<TuckShopSalesEntry[]>([]);
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = useCallback(async () => {
    const result = await fetchTuckShopSales({
      tuckShopPeriod: period,
      startDate,
      endDate,
    });
    setData(result);
  }, [fetchTuckShopSales, period, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = data.map((d) => ({
    label: formatPeriodLabel(d, period),
    totalSales: d.totalSales,
    orderCount: d.orderCount,
  }));

  const totalSales = data.reduce((sum, d) => sum + d.totalSales, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orderCount, 0);

  const exportData = chartData.map((d) => ({
    Period: d.label,
    'Total Sales': formatCurrency(d.totalSales),
    'Sales (cents)': d.totalSales,
    Orders: d.orderCount,
  }));

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setPeriod('daily');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tuck Shop Sales" description="Sales trends and order counts">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/reports')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Period</label>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={period === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onReset={handleReset}
      >
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="tuck-shop-sales-report"
          columns={[
            { key: 'Period', header: 'Period' },
            { key: 'Total Sales', header: 'Total Sales' },
            { key: 'Sales (cents)', header: 'Sales (cents)' },
            { key: 'Orders', header: 'Orders' },
          ]}
        />
      </DateRangeFilter>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  {totalOrders > 0 ? formatCurrency(Math.round(totalSales / totalOrders)) : formatCurrency(0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <LineChartComponent
                  data={chartData as Record<string, unknown>[]}
                  xKey="label"
                  lines={[
                    { key: 'totalSales', color: '#2563EB', name: 'Sales' },
                  ]}
                  height={350}
                />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No tuck shop data for the selected period.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orders by Period</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <BarChartComponent
                  data={chartData as Record<string, unknown>[]}
                  xKey="label"
                  bars={[
                    { key: 'orderCount', color: '#F97316', name: 'Orders' },
                  ]}
                  height={300}
                />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No tuck shop data for the selected period.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
