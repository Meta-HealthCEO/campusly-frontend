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
import type { RevenueDataPoint } from '@/hooks/useReports';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatRevenueData(data: RevenueDataPoint[]) {
  return data.map((d) => ({
    label: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
    total: d.total,
    month: d.month,
    year: d.year,
  }));
}

export default function RevenueReportPage() {
  const router = useRouter();
  const { loading, fetchRevenue } = useReports();
  const [data, setData] = useState<RevenueDataPoint[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = useCallback(async () => {
    const result = await fetchRevenue({ startDate, endDate });
    setData(result);
  }, [fetchRevenue, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = formatRevenueData(data);
  const totalRevenue = data.reduce((sum, d) => sum + d.total, 0);

  const exportData = chartData.map((d) => ({
    Month: d.label,
    Revenue: formatCurrency(d.total),
    'Revenue (cents)': d.total,
  }));

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue Report" description="Monthly revenue trends and payment collections">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/reports')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onReset={handleReset}
      >
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="revenue-report"
          columns={[
            { key: 'Month', header: 'Month' },
            { key: 'Revenue', header: 'Revenue' },
            { key: 'Revenue (cents)', header: 'Revenue (cents)' },
          ]}
        />
      </DateRangeFilter>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {data.length} month(s)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Monthly Average</p>
                <p className="text-2xl font-bold">
                  {data.length > 0 ? formatCurrency(Math.round(totalRevenue / data.length)) : formatCurrency(0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <LineChartComponent
                  data={chartData as Record<string, unknown>[]}
                  xKey="label"
                  lines={[{ key: 'total', color: '#2563EB', name: 'Revenue' }]}
                  height={350}
                />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No revenue data for the selected period.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Month</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <BarChartComponent
                  data={chartData as Record<string, unknown>[]}
                  xKey="label"
                  bars={[{ key: 'total', color: '#2563EB', name: 'Revenue' }]}
                  height={350}
                />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No revenue data for the selected period.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
