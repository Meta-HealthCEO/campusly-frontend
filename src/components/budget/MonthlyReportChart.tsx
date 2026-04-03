'use client';

import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { MonthlyReport } from '@/types';

interface MonthlyReportChartProps {
  report: MonthlyReport | null;
}

export function MonthlyReportChart({ report }: MonthlyReportChartProps) {
  const chartData = useMemo(() => {
    if (!report) return [];
    return report.months.map((m) => ({
      month: m.label.slice(0, 3),
      income: m.income / 100,
      expenditure: m.expenditure / 100,
      surplus: m.surplus / 100,
      cumulativeIncome: m.cumulativeIncome / 100,
      cumulativeExpenditure: m.cumulativeExpenditure / 100,
    }));
  }, [report]);

  if (!report || chartData.length === 0) {
    return <EmptyState icon={BarChart3} title="No monthly data" description="No report data available." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-4">Monthly Income vs Expenditure — {report.year}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v: number) => `R${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v * 100)} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenditure" name="Expenditure" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Line
              dataKey="surplus"
              name="Surplus"
              type="monotone"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">Month</th>
              <th className="py-2 pr-4 text-right">Income</th>
              <th className="py-2 pr-4 text-right">Expenditure</th>
              <th className="py-2 pr-4 text-right">Surplus</th>
              <th className="py-2 pr-4 text-right">Cum. Income</th>
              <th className="py-2 text-right">Cum. Expenditure</th>
            </tr>
          </thead>
          <tbody>
            {report.months.map((m) => (
              <tr key={m.month} className="border-b">
                <td className="py-2 pr-4">{m.label}</td>
                <td className="py-2 pr-4 text-right">{formatCurrency(m.income)}</td>
                <td className="py-2 pr-4 text-right">{formatCurrency(m.expenditure)}</td>
                <td className={`py-2 pr-4 text-right ${m.surplus < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(m.surplus)}
                </td>
                <td className="py-2 pr-4 text-right">{formatCurrency(m.cumulativeIncome)}</td>
                <td className="py-2 text-right">{formatCurrency(m.cumulativeExpenditure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
