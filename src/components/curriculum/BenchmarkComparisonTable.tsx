'use client';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';
import type { BenchmarkComparison, BenchmarkComparisonStatus } from '@/types';

interface BenchmarkComparisonTableProps {
  comparisons: BenchmarkComparison[];
}

function StatusBadge({ status }: { status: BenchmarkComparisonStatus }) {
  switch (status) {
    case 'above_target':
      return <Badge className="bg-emerald-600 text-white">Above Target</Badge>;
    case 'at_target':
      return <Badge variant="secondary">At Target</Badge>;
    case 'below_target':
      return <Badge variant="destructive">Below Target</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function VarianceCell({
  variance,
  status,
}: {
  variance: number;
  status: BenchmarkComparisonStatus;
}) {
  const sign = variance > 0 ? '+' : '';
  const className =
    status === 'above_target'
      ? 'text-emerald-600 font-medium'
      : status === 'below_target'
        ? 'text-destructive font-medium'
        : 'text-muted-foreground';
  return <span className={className}>{sign}{variance.toFixed(1)}%</span>;
}

export function BenchmarkComparisonTable({ comparisons }: BenchmarkComparisonTableProps) {
  if (comparisons.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No comparison data"
        description="Benchmark comparisons will appear once results and targets are both configured."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Subject</th>
            <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Grade</th>
            <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Target %</th>
            <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Actual %</th>
            <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Variance</th>
            <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Status</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((row, idx) => {
            const rowClass =
              row.status === 'above_target'
                ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                : row.status === 'below_target'
                  ? 'bg-destructive/5'
                  : '';

            return (
              <tr
                key={`${row.subjectId}-${row.gradeId}-${idx}`}
                className={`border-b last:border-0 ${rowClass}`}
              >
                <td className="px-4 py-3 font-medium truncate max-w-[140px]">
                  {row.subjectName}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {row.gradeName}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {row.targetPassRate}%
                </td>
                <td
                  className={`px-4 py-3 text-right whitespace-nowrap font-medium ${
                    row.status === 'above_target'
                      ? 'text-emerald-600'
                      : row.status === 'below_target'
                        ? 'text-destructive'
                        : ''
                  }`}
                >
                  {row.actualPassRate}%
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <VarianceCell variance={row.passRateVariance} status={row.status} />
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
