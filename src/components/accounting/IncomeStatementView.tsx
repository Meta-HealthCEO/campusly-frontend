'use client';

import { useMemo } from 'react';
import { DollarSign, TrendingUp, AlertCircle, MinusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils';
import type { IncomeStatement } from '@/types';

interface Props {
  statement: IncomeStatement | null;
  loading: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  tuition: 'Tuition',
  extramural: 'Extramural',
  camp: 'Camp',
  uniform: 'Uniform',
  transport: 'Transport',
  other: 'Other',
};

export function IncomeStatementView({ statement, loading }: Props) {
  const collectionRate = useMemo(() => {
    if (!statement || statement.totalInvoiced === 0) return 0;
    return Math.round((statement.totalCollected / statement.totalInvoiced) * 100);
  }, [statement]);

  if (loading) return <LoadingSpinner />;
  if (!statement) return <EmptyState icon={DollarSign} title="No data" description="Select a date range to view the income statement." />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Invoiced" value={formatCurrency(statement.totalInvoiced)} icon={DollarSign} />
        <StatCard title="Total Collected" value={formatCurrency(statement.totalCollected)} icon={TrendingUp} />
        <StatCard title="Outstanding" value={formatCurrency(statement.outstanding)} icon={AlertCircle} />
        <StatCard title="Write-offs" value={formatCurrency(statement.writeOffs)} icon={MinusCircle} />
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue by Category</CardTitle></CardHeader>
        <CardContent>
          {statement.revenueByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenue data for this period.</p>
          ) : (
            <div className="space-y-3">
              {statement.revenueByCategory.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{CATEGORY_LABELS[cat.category] ?? cat.category}</p>
                    <p className="text-xs text-muted-foreground">{cat.count} invoice{cat.count !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(cat.totalInvoiced)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Collection Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">{collectionRate}% collected</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
