'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChartComponent } from '@/components/charts';
import type { MonthlyTrend } from '@/types';

interface IncomeExpenditureTrendChartProps {
  trends: MonthlyTrend[];
}

export function IncomeExpenditureTrendChart({ trends }: IncomeExpenditureTrendChartProps) {
  const chartData = trends.map((t) => ({
    month: t.month,
    income: Math.round(t.income / 100),
    expenditure: Math.round(t.expenditure / 100),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Income vs Expenditure</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChartComponent
          data={chartData}
          xKey="month"
          lines={[
            { key: 'income', color: '#10B981', name: 'Income (R)' },
            { key: 'expenditure', color: '#EF4444', name: 'Expenditure (R)' },
          ]}
          height={300}
        />
      </CardContent>
    </Card>
  );
}
