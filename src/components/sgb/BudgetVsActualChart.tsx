'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent } from '@/components/charts';

interface BudgetComparison {
  budgetedIncome: number;
  actualIncome: number;
  budgetedExpenditure: number;
  actualExpenditure: number;
  incomeVariance: number;
  expenditureVariance: number;
}

interface BudgetVsActualChartProps {
  data: BudgetComparison | null;
}

export function BudgetVsActualChart({ data }: BudgetVsActualChartProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No budget data available yet. Budget comparison will appear once the Budget module is configured.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { category: 'Income', budgeted: Math.round(data.budgetedIncome / 100), actual: Math.round(data.actualIncome / 100) },
    { category: 'Expenditure', budgeted: Math.round(data.budgetedExpenditure / 100), actual: Math.round(data.actualExpenditure / 100) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actual</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartComponent
          data={chartData}
          xKey="category"
          bars={[
            { key: 'budgeted', color: '#94A3B8', name: 'Budgeted (R)' },
            { key: 'actual', color: '#2563EB', name: 'Actual (R)' },
          ]}
          height={300}
        />
      </CardContent>
    </Card>
  );
}
