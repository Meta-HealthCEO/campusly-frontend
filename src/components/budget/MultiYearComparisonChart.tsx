'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ComparisonReport } from '@/types';

const YEAR_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

interface MultiYearComparisonChartProps {
  report: ComparisonReport | null;
}

export function MultiYearComparisonChart({ report }: MultiYearComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!report) return [];
    return report.totals.map((t) => ({
      year: String(t.year),
      budgeted: t.budgeted / 100,
      actual: t.actual / 100,
    }));
  }, [report]);

  if (!report || report.years.length === 0) {
    return <EmptyState icon={BarChart3} title="No comparison data" description="Select years to compare." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-4">Multi-Year Budget Comparison</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(v: number) => `R${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatCurrency(Number(v) * 100)} />
            <Legend />
            <Bar dataKey="budgeted" name="Budgeted" fill={YEAR_COLORS[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" name="Actual" fill={YEAR_COLORS[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">Category</th>
              {report.years.map((y) => (
                <th key={y} className="py-2 pr-4 text-right" colSpan={2}>
                  {y}
                </th>
              ))}
            </tr>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1 pr-4" />
              {report.years.map((y) => (
                <th key={y} className="py-1 pr-2 text-right text-xs" colSpan={1}>
                  Budgeted
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.categories.map((cat) => (
              <tr key={cat.categoryName} className="border-b">
                <td className="py-2 pr-4 truncate max-w-37.5">{cat.categoryName}</td>
                {report.years.map((y) => {
                  const val = cat.values.find((v) => v.year === y);
                  return (
                    <td key={y} className="py-2 pr-4 text-right">
                      {val ? formatCurrency(val.budgeted) : '\u2014'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="py-2 pr-4">Total</td>
              {report.totals.map((t) => (
                <td key={t.year} className="py-2 pr-4 text-right">
                  {formatCurrency(t.budgeted)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
