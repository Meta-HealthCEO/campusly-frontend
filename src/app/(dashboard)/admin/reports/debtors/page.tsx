'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PieChartComponent } from '@/components/charts';
import { ExportButton } from '@/components/reports/ExportButton';
import { DebtorsTable } from '@/components/reports/DebtorsTable';
import { formatCurrency } from '@/lib/utils';
import { useReports } from '@/hooks/useReports';
import type { DebtorReportEntry } from '@/hooks/useReports';

const BUCKET_COLORS: Record<string, string> = {
  '0-30': '#10B981',
  '31-60': '#F59E0B',
  '61-90': '#F97316',
  '90+': '#EF4444',
};

function getBucketSummary(data: DebtorReportEntry[]) {
  const buckets: Record<string, { count: number; total: number }> = {
    '0-30': { count: 0, total: 0 },
    '31-60': { count: 0, total: 0 },
    '61-90': { count: 0, total: 0 },
    '90+': { count: 0, total: 0 },
  };
  for (const d of data) {
    const b = buckets[d.bucket];
    if (b) {
      b.count += 1;
      b.total += d.outstanding;
    }
  }
  return buckets;
}

export default function DebtorsReportPage() {
  const router = useRouter();
  const { loading, fetchDebtors } = useReports();
  const [data, setData] = useState<DebtorReportEntry[]>([]);
  const [bucketFilter, setBucketFilter] = useState('');

  useEffect(() => {
    async function loadData() {
      const result = await fetchDebtors();
      setData(result);
    }
    loadData();
  }, [fetchDebtors]);

  const bucketSummary = getBucketSummary(data);
  const totalOutstanding = data.reduce((sum, d) => sum + d.outstanding, 0);
  const filteredData = bucketFilter ? data.filter((d) => d.bucket === bucketFilter) : data;

  const pieData = Object.entries(bucketSummary)
    .filter(([, v]) => v.total > 0)
    .map(([bucket, v]) => ({
      name: `${bucket} days`,
      value: v.total,
      color: BUCKET_COLORS[bucket],
    }));

  const exportData = filteredData.map((d) => {
    const firstName = d.studentId?.userId?.firstName ?? '';
    const lastName = d.studentId?.userId?.lastName ?? '';
    return {
      'Invoice #': d.invoiceNumber,
      Student: `${firstName} ${lastName}`.trim() || d.studentId?.admissionNumber || '-',
      'Admission #': d.studentId?.admissionNumber ?? '-',
      Total: formatCurrency(d.totalAmount),
      Paid: formatCurrency(d.paidAmount),
      Outstanding: formatCurrency(d.outstanding),
      'Age (days)': d.ageDays,
      Bucket: d.bucket,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Debtor Analysis" description="Outstanding invoices with ageing buckets">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/reports')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1">
          <Button
            variant={bucketFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBucketFilter('')}
          >
            All
          </Button>
          {Object.keys(BUCKET_COLORS).map((b) => (
            <Button
              key={b}
              variant={bucketFilter === b ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBucketFilter(b)}
            >
              {b}
            </Button>
          ))}
        </div>
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="debtors-report"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{data.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">90+ Days</p>
                <p className="text-2xl font-bold text-destructive">
                  {bucketSummary['90+'].count} ({formatCurrency(bucketSummary['90+'].total)})
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Debtors</CardTitle>
              </CardHeader>
              <CardContent>
                <DebtorsTable data={filteredData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ageing Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <PieChartComponent data={pieData} height={300} />
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No outstanding invoices.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
