'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChartComponent } from '@/components/charts';
import { formatCurrency } from '@/lib/utils';
import type { CashFlowReport } from '@/types';

interface CashFlowChartProps {
  report: CashFlowReport | null;
}

export function CashFlowChart({ report }: CashFlowChartProps) {
  const chartData = useMemo(() => {
    if (!report) return [];
    return report.projections.map((p) => ({
      month: p.month,
      'Expected Income': p.expectedIncome / 100,
      'Planned Expenses': p.plannedExpenditure / 100,
      'Projected Balance': p.projectedBalance / 100,
    }));
  }, [report]);

  if (!report) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Current remaining balance: <span className="font-semibold">{formatCurrency(report.currentBalance)}</span>
          </p>
          <LineChartComponent
            data={chartData}
            xKey="month"
            lines={[
              { key: 'Expected Income', color: '#10B981', name: 'Expected Income' },
              { key: 'Planned Expenses', color: '#EF4444', name: 'Planned Expenses' },
              { key: 'Projected Balance', color: '#2563EB', name: 'Projected Balance' },
            ]}
            height={350}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Month</th>
                  <th className="text-right py-2 px-4">Expected Income</th>
                  <th className="text-right py-2 px-4">Planned Expenses</th>
                  <th className="text-right py-2 px-4">Projected Balance</th>
                </tr>
              </thead>
              <tbody>
                {report.projections.map((p) => (
                  <tr key={p.month} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{p.month}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(p.expectedIncome)}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(p.plannedExpenditure)}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(p.projectedBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
