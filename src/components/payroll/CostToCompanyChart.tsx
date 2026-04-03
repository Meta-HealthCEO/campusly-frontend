'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CostToCompanyReport } from '@/types';

interface CostToCompanyChartProps {
  report: CostToCompanyReport | null;
}

export function CostToCompanyChart({ report }: CostToCompanyChartProps) {
  const chartData = useMemo(() => {
    if (!report) return [];
    return report.departments.map((d) => ({
      department: d.department,
      basic: d.totalBasic / 100,
      allowances: d.totalAllowances / 100,
      employerContributions: d.totalEmployerContributions / 100,
    }));
  }, [report]);

  if (!report || chartData.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No CTC data"
        description="No cost-to-company report is available for the selected period."
      />
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold mb-4">Cost to Company by Department</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="department" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => `R${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => formatCurrency(Number(v) * 100)} />
          <Legend />
          <Bar
            dataKey="basic"
            name="Basic Salary"
            stackId="ctc"
            fill="hsl(var(--chart-1))"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="allowances"
            name="Allowances"
            stackId="ctc"
            fill="hsl(var(--chart-2))"
          />
          <Bar
            dataKey="employerContributions"
            name="Employer Contributions"
            stackId="ctc"
            fill="hsl(var(--chart-3))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
