'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent } from '@/components/charts';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { VarianceReport } from '@/types';

interface VarianceChartProps {
  report: VarianceReport | null;
}

export function VarianceChart({ report }: VarianceChartProps) {
  const chartData = useMemo(() => {
    if (!report) return [];
    return report.categories.map((c) => ({
      category: c.categoryCode,
      Budgeted: c.budgeted / 100,
      Actual: c.actual / 100,
    }));
  }, [report]);

  if (!report) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartComponent
            data={chartData}
            xKey="category"
            bars={[
              { key: 'Budgeted', color: '#2563EB', name: 'Budgeted' },
              { key: 'Actual', color: '#F97316', name: 'Actual' },
            ]}
            height={350}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variance Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Category</th>
                  <th className="text-right py-2 px-4">Budgeted</th>
                  <th className="text-right py-2 px-4">Actual</th>
                  <th className="text-right py-2 px-4">Variance</th>
                  <th className="text-right py-2 px-4">Used</th>
                  <th className="text-left py-2 pl-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.categories.map((c) => (
                  <tr key={c.categoryId} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{c.categoryName}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(c.budgeted)}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(c.actual)}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(c.variance)}</td>
                    <td className="py-2 px-4 text-right">{c.utilizationPercent}%</td>
                    <td className="py-2 pl-4">
                      <Badge
                        variant={
                          c.status === 'over_budget' ? 'destructive'
                            : c.status === 'warning' ? 'secondary' : 'default'
                        }
                      >
                        {c.status === 'over_budget' ? 'Over Budget'
                          : c.status === 'warning' ? 'Warning' : 'On Track'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 px-4 text-right">{formatCurrency(report.totalBudgeted)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrency(report.totalActual)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrency(report.totalVariance)}</td>
                  <td className="py-2 px-4 text-right">
                    {report.totalBudgeted > 0
                      ? Math.round((report.totalActual / report.totalBudgeted) * 1000) / 10
                      : 0}%
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
