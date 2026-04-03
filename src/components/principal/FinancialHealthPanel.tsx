'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent, LineChartComponent } from '@/components/charts';
import { formatCurrency } from '@/lib/utils';
import type { FinancialHealth } from '@/types';

interface FinancialHealthPanelProps {
  data: FinancialHealth;
}

export function FinancialHealthPanel({ data }: FinancialHealthPanelProps) {
  const { revenueVsBudget, outstandingFeesAging, cashFlowProjection } = data;

  // Revenue vs Budget bar chart data
  const revenueChartData = revenueVsBudget.monthlyBreakdown
    .filter((m) => m.revenue > 0 || m.budget > 0)
    .map((m) => ({
      month: `M${m.month}`,
      revenue: m.revenue,
      budget: m.budget,
    }));

  // Cash flow line chart
  const cashFlowData = cashFlowProjection.map((p) => ({
    month: p.month,
    income: p.projectedIncome,
    expenses: p.projectedExpenses,
  }));

  // Aging data for display
  const agingItems = [
    { label: 'Current', value: outstandingFeesAging.current },
    { label: '1-30 days', value: outstandingFeesAging.thirtyDays },
    { label: '31-60 days', value: outstandingFeesAging.sixtyDays },
    { label: '61-90 days', value: outstandingFeesAging.ninetyDays },
    { label: '90+ days', value: outstandingFeesAging.overNinetyDays },
  ];

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold">{formatCurrency(revenueVsBudget.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">
              {revenueVsBudget.percentOfBudget}% of budget
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Annual Budget</p>
            <p className="text-xl font-bold">{formatCurrency(revenueVsBudget.annualBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Outstanding Fees</p>
            <p className="text-xl font-bold text-destructive">
              {formatCurrency(outstandingFeesAging.total)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <BarChartComponent
                data={revenueChartData}
                xKey="month"
                bars={[
                  { key: 'revenue', color: '#2563EB', name: 'Revenue' },
                  { key: 'budget', color: '#D1D5DB', name: 'Budget' },
                ]}
                height={250}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cash Flow Projection</CardTitle>
          </CardHeader>
          <CardContent>
            {cashFlowData.length > 0 ? (
              <LineChartComponent
                data={cashFlowData}
                xKey="month"
                lines={[
                  { key: 'income', color: '#16A34A', name: 'Projected Income' },
                  { key: 'expenses', color: '#EF4444', name: 'Projected Expenses' },
                ]}
                height={250}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Set budget first</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aging table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outstanding Fees Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {agingItems.map((item) => (
                    <th key={item.label} className="text-center p-2 font-medium text-muted-foreground">
                      {item.label}
                    </th>
                  ))}
                  <th className="text-center p-2 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  {agingItems.map((item) => (
                    <td key={item.label} className="text-center p-2 font-medium">
                      {formatCurrency(item.value)}
                    </td>
                  ))}
                  <td className="text-center p-2 font-bold">
                    {formatCurrency(outstandingFeesAging.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
